from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'cam_tgu_db')]

# Create the main app without a prefix
app = FastAPI(title="CAM-TGU Equipment Loan API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============= MODELS =============

class Participant(BaseModel):
    """Integrante del préstamo"""
    name: str
    account_number: str
    signature: Optional[str] = None  # Base64 encoded signature

class Equipment(BaseModel):
    """Equipo prestado"""
    name: str
    serial_number: str
    description: str

class Vehicle(BaseModel):
    """Datos del vehículo"""
    plate: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    color: Optional[str] = None
    driver_name: Optional[str] = None

class LoanRecordCreate(BaseModel):
    """Modelo para crear un préstamo"""
    # Datos generales
    class_name: str
    section: str
    teacher_name: str
    practice_description: str
    
    # Fechas y horas
    departure_date: str
    departure_time: str
    return_date: str
    return_time: str
    
    # Personal del CAM
    delivered_by: str
    reviewed_by: str
    
    # Vehículo (opcional)
    vehicle: Optional[Vehicle] = None
    
    # Integrantes
    participants: List[Participant] = []
    
    # Equipos
    equipment_list: List[Equipment] = []
    
    # Firma del responsable
    responsible_signature: Optional[str] = None
    
    # Estado
    status: str = "active"  # active, returned, cancelled

class LoanRecord(LoanRecordCreate):
    """Modelo completo del préstamo con ID y timestamps"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    request_date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class LoanRecordUpdate(BaseModel):
    """Modelo para actualizar un préstamo"""
    class_name: Optional[str] = None
    section: Optional[str] = None
    teacher_name: Optional[str] = None
    practice_description: Optional[str] = None
    departure_date: Optional[str] = None
    departure_time: Optional[str] = None
    return_date: Optional[str] = None
    return_time: Optional[str] = None
    delivered_by: Optional[str] = None
    reviewed_by: Optional[str] = None
    vehicle: Optional[Vehicle] = None
    participants: Optional[List[Participant]] = None
    equipment_list: Optional[List[Equipment]] = None
    responsible_signature: Optional[str] = None
    status: Optional[str] = None


# ============= ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "CAM-TGU Equipment Loan API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "database": "connected"}

# --- Loan Records CRUD ---

@api_router.post("/loans", response_model=LoanRecord)
async def create_loan(loan_data: LoanRecordCreate):
    """Crear un nuevo registro de préstamo"""
    loan_dict = loan_data.dict()
    loan_obj = LoanRecord(**loan_dict)
    
    await db.loans.insert_one(loan_obj.dict())
    return loan_obj

@api_router.get("/loans", response_model=List[LoanRecord])
async def get_all_loans(status: Optional[str] = None):
    """Obtener todos los préstamos, opcionalmente filtrados por estado"""
    query = {}
    if status:
        query["status"] = status
    
    loans = await db.loans.find(query).sort("created_at", -1).to_list(1000)
    return [LoanRecord(**loan) for loan in loans]

@api_router.get("/loans/{loan_id}", response_model=LoanRecord)
async def get_loan(loan_id: str):
    """Obtener un préstamo específico por ID"""
    loan = await db.loans.find_one({"id": loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    return LoanRecord(**loan)

@api_router.put("/loans/{loan_id}", response_model=LoanRecord)
async def update_loan(loan_id: str, loan_update: LoanRecordUpdate):
    """Actualizar un préstamo existente"""
    loan = await db.loans.find_one({"id": loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    update_data = {k: v for k, v in loan_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.loans.update_one({"id": loan_id}, {"$set": update_data})
    
    updated_loan = await db.loans.find_one({"id": loan_id})
    return LoanRecord(**updated_loan)

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str):
    """Eliminar un préstamo"""
    result = await db.loans.delete_one({"id": loan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    return {"message": "Préstamo eliminado exitosamente"}

@api_router.patch("/loans/{loan_id}/status")
async def update_loan_status(loan_id: str, status: str):
    """Actualizar solo el estado de un préstamo"""
    if status not in ["active", "returned", "cancelled"]:
        raise HTTPException(status_code=400, detail="Estado inválido")
    
    loan = await db.loans.find_one({"id": loan_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Préstamo no encontrado")
    
    await db.loans.update_one(
        {"id": loan_id}, 
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    
    updated_loan = await db.loans.find_one({"id": loan_id})
    return LoanRecord(**updated_loan)

# --- Statistics ---

@api_router.get("/stats")
async def get_statistics():
    """Obtener estadísticas generales"""
    total = await db.loans.count_documents({})
    active = await db.loans.count_documents({"status": "active"})
    returned = await db.loans.count_documents({"status": "returned"})
    cancelled = await db.loans.count_documents({"status": "cancelled"})
    
    return {
        "total": total,
        "active": active,
        "returned": returned,
        "cancelled": cancelled
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
