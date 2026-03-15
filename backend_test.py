#!/usr/bin/env python3
"""
Comprehensive backend API testing for CAM-TGU Equipment Loan System
Tests all CRUD operations, status transitions, error handling, and filtering
"""

import requests
import json
import uuid
from datetime import datetime
import sys

# Base URL from environment
BACKEND_URL = "https://lab-asset-control.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

def log_test_result(test_name, passed, details=""):
    """Log test result with consistent formatting"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} {test_name}")
    if details:
        print(f"    Details: {details}")
    print()

def create_test_loan_data(class_name="Ingeniería de Sistemas", status="active"):
    """Create realistic test loan data"""
    return {
        "class_name": class_name,
        "section": "IS-401",
        "teacher_name": "Prof. María González",
        "practice_description": "Práctica de campo en laboratorio de redes",
        "departure_date": "15/01/2025",
        "departure_time": "08:30",
        "return_date": "15/01/2025", 
        "return_time": "17:00",
        "delivered_by": "Carlos Mendoza",
        "reviewed_by": "Ana Rodríguez",
        "vehicle": {
            "plate": "HND-2024",
            "brand": "Honda",
            "model": "CR-V",
            "color": "Blanco",
            "driver_name": "Roberto Silva"
        },
        "participants": [
            {"name": "Luis Fernando García", "account_number": "20190001", "signature": ""},
            {"name": "María José Hernández", "account_number": "20190002", "signature": ""},
            {"name": "Carlos Eduardo López", "account_number": "20190003", "signature": ""}
        ],
        "equipment_list": [
            {"name": "Cámara Digital Canon", "serial_number": "CAN001", "description": "Cámara profesional 24MP"},
            {"name": "Trípode Manfrotto", "serial_number": "MAN002", "description": "Trípode de aluminio"},
            {"name": "Reflector de Luz", "serial_number": "REF003", "description": "Reflector plegable 5-en-1"}
        ],
        "responsible_signature": "",
        "status": status
    }

def test_health_check():
    """Test GET /api/health endpoint"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        passed = response.status_code == 200 and response.json().get("status") == "healthy"
        log_test_result("Health Check", passed, f"Status: {response.status_code}, Response: {response.json()}")
        return passed
    except Exception as e:
        log_test_result("Health Check", False, f"Error: {str(e)}")
        return False

def test_create_loan():
    """Test POST /api/loans endpoint"""
    try:
        loan_data = create_test_loan_data()
        response = requests.post(f"{API_BASE}/loans", json=loan_data, timeout=10)
        
        if response.status_code != 200:
            log_test_result("Create Loan", False, f"Status: {response.status_code}, Response: {response.text}")
            return None, False
            
        created_loan = response.json()
        
        # Verify required fields are present
        required_fields = ["id", "class_name", "section", "teacher_name", "created_at", "status"]
        missing_fields = [field for field in required_fields if field not in created_loan]
        
        if missing_fields:
            log_test_result("Create Loan", False, f"Missing fields: {missing_fields}")
            return None, False
            
        # Verify data integrity
        data_correct = (
            created_loan["class_name"] == loan_data["class_name"] and
            created_loan["section"] == loan_data["section"] and
            created_loan["status"] == loan_data["status"] and
            len(created_loan["participants"]) == len(loan_data["participants"]) and
            len(created_loan["equipment_list"]) == len(loan_data["equipment_list"])
        )
        
        if not data_correct:
            log_test_result("Create Loan", False, "Data integrity check failed")
            return None, False
            
        log_test_result("Create Loan", True, f"Created loan with ID: {created_loan['id']}")
        return created_loan["id"], True
        
    except Exception as e:
        log_test_result("Create Loan", False, f"Error: {str(e)}")
        return None, False

def test_get_all_loans():
    """Test GET /api/loans endpoint"""
    try:
        response = requests.get(f"{API_BASE}/loans", timeout=10)
        
        if response.status_code != 200:
            log_test_result("Get All Loans", False, f"Status: {response.status_code}")
            return False
            
        loans = response.json()
        
        if not isinstance(loans, list):
            log_test_result("Get All Loans", False, "Response is not a list")
            return False
            
        log_test_result("Get All Loans", True, f"Retrieved {len(loans)} loans")
        return True
        
    except Exception as e:
        log_test_result("Get All Loans", False, f"Error: {str(e)}")
        return False

def test_get_loans_with_filter():
    """Test GET /api/loans with status filter"""
    try:
        response = requests.get(f"{API_BASE}/loans?status=active", timeout=10)
        
        if response.status_code != 200:
            log_test_result("Get Loans (Filtered)", False, f"Status: {response.status_code}")
            return False
            
        loans = response.json()
        
        # Verify all loans have active status
        if loans and not all(loan.get("status") == "active" for loan in loans):
            log_test_result("Get Loans (Filtered)", False, "Filter not working correctly")
            return False
            
        log_test_result("Get Loans (Filtered)", True, f"Retrieved {len(loans)} active loans")
        return True
        
    except Exception as e:
        log_test_result("Get Loans (Filtered)", False, f"Error: {str(e)}")
        return False

def test_get_single_loan(loan_id):
    """Test GET /api/loans/{id} endpoint"""
    try:
        response = requests.get(f"{API_BASE}/loans/{loan_id}", timeout=10)
        
        if response.status_code != 200:
            log_test_result("Get Single Loan", False, f"Status: {response.status_code}")
            return False
            
        loan = response.json()
        
        if loan.get("id") != loan_id:
            log_test_result("Get Single Loan", False, "ID mismatch")
            return False
            
        log_test_result("Get Single Loan", True, f"Retrieved loan: {loan.get('class_name', 'N/A')}")
        return True
        
    except Exception as e:
        log_test_result("Get Single Loan", False, f"Error: {str(e)}")
        return False

def test_get_nonexistent_loan():
    """Test GET /api/loans/{id} with non-existent ID"""
    try:
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{API_BASE}/loans/{fake_id}", timeout=10)
        
        passed = response.status_code == 404
        log_test_result("Get Non-existent Loan (404)", passed, f"Status: {response.status_code}")
        return passed
        
    except Exception as e:
        log_test_result("Get Non-existent Loan (404)", False, f"Error: {str(e)}")
        return False

def test_update_loan(loan_id):
    """Test PUT /api/loans/{id} endpoint"""
    try:
        update_data = {
            "class_name": "Ingeniería de Software Actualizada",
            "section": "IS-501",
            "teacher_name": "Prof. Juan Carlos Pérez"
        }
        
        response = requests.put(f"{API_BASE}/loans/{loan_id}", json=update_data, timeout=10)
        
        if response.status_code != 200:
            log_test_result("Update Loan", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        updated_loan = response.json()
        
        # Verify updates were applied
        updates_correct = (
            updated_loan["class_name"] == update_data["class_name"] and
            updated_loan["section"] == update_data["section"] and
            updated_loan["teacher_name"] == update_data["teacher_name"]
        )
        
        if not updates_correct:
            log_test_result("Update Loan", False, "Updates were not applied correctly")
            return False
            
        log_test_result("Update Loan", True, f"Updated loan: {updated_loan['class_name']}")
        return True
        
    except Exception as e:
        log_test_result("Update Loan", False, f"Error: {str(e)}")
        return False

def test_update_nonexistent_loan():
    """Test PUT /api/loans/{id} with non-existent ID"""
    try:
        fake_id = str(uuid.uuid4())
        update_data = {"class_name": "Test Update"}
        
        response = requests.put(f"{API_BASE}/loans/{fake_id}", json=update_data, timeout=10)
        
        passed = response.status_code == 404
        log_test_result("Update Non-existent Loan (404)", passed, f"Status: {response.status_code}")
        return passed
        
    except Exception as e:
        log_test_result("Update Non-existent Loan (404)", False, f"Error: {str(e)}")
        return False

def test_update_loan_status(loan_id):
    """Test PATCH /api/loans/{id}/status endpoint"""
    try:
        # Test valid status change
        response = requests.patch(f"{API_BASE}/loans/{loan_id}/status?status=returned", timeout=10)
        
        if response.status_code != 200:
            log_test_result("Update Loan Status", False, f"Status: {response.status_code}, Response: {response.text}")
            return False
            
        updated_loan = response.json()
        
        if updated_loan.get("status") != "returned":
            log_test_result("Update Loan Status", False, "Status not updated correctly")
            return False
            
        log_test_result("Update Loan Status", True, f"Status updated to: {updated_loan['status']}")
        return True
        
    except Exception as e:
        log_test_result("Update Loan Status", False, f"Error: {str(e)}")
        return False

def test_update_loan_status_invalid():
    """Test PATCH /api/loans/{id}/status with invalid status"""
    try:
        # Create a loan for testing
        loan_data = create_test_loan_data()
        create_response = requests.post(f"{API_BASE}/loans", json=loan_data, timeout=10)
        if create_response.status_code != 200:
            log_test_result("Update Loan Status (Invalid)", False, "Failed to create test loan")
            return False
            
        loan_id = create_response.json()["id"]
        
        # Test invalid status
        response = requests.patch(f"{API_BASE}/loans/{loan_id}/status?status=invalid_status", timeout=10)
        
        passed = response.status_code == 400
        log_test_result("Update Loan Status (Invalid)", passed, f"Status: {response.status_code}")
        return passed
        
    except Exception as e:
        log_test_result("Update Loan Status (Invalid)", False, f"Error: {str(e)}")
        return False

def test_update_status_nonexistent_loan():
    """Test PATCH /api/loans/{id}/status with non-existent ID"""
    try:
        fake_id = str(uuid.uuid4())
        response = requests.patch(f"{API_BASE}/loans/{fake_id}/status?status=returned", timeout=10)
        
        passed = response.status_code == 404
        log_test_result("Update Status Non-existent Loan (404)", passed, f"Status: {response.status_code}")
        return passed
        
    except Exception as e:
        log_test_result("Update Status Non-existent Loan (404)", False, f"Error: {str(e)}")
        return False

def test_delete_loan():
    """Test DELETE /api/loans/{id} endpoint"""
    try:
        # Create a loan to delete
        loan_data = create_test_loan_data(class_name="Loan to Delete")
        create_response = requests.post(f"{API_BASE}/loans", json=loan_data, timeout=10)
        
        if create_response.status_code != 200:
            log_test_result("Delete Loan", False, "Failed to create loan for deletion test")
            return False
            
        loan_id = create_response.json()["id"]
        
        # Delete the loan
        delete_response = requests.delete(f"{API_BASE}/loans/{loan_id}", timeout=10)
        
        if delete_response.status_code != 200:
            log_test_result("Delete Loan", False, f"Status: {delete_response.status_code}")
            return False
            
        # Verify loan was deleted
        get_response = requests.get(f"{API_BASE}/loans/{loan_id}", timeout=10)
        
        if get_response.status_code != 404:
            log_test_result("Delete Loan", False, "Loan still exists after deletion")
            return False
            
        log_test_result("Delete Loan", True, f"Successfully deleted loan {loan_id}")
        return True
        
    except Exception as e:
        log_test_result("Delete Loan", False, f"Error: {str(e)}")
        return False

def test_delete_nonexistent_loan():
    """Test DELETE /api/loans/{id} with non-existent ID"""
    try:
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{API_BASE}/loans/{fake_id}", timeout=10)
        
        passed = response.status_code == 404
        log_test_result("Delete Non-existent Loan (404)", passed, f"Status: {response.status_code}")
        return passed
        
    except Exception as e:
        log_test_result("Delete Non-existent Loan (404)", False, f"Error: {str(e)}")
        return False

def test_statistics():
    """Test GET /api/stats endpoint"""
    try:
        response = requests.get(f"{API_BASE}/stats", timeout=10)
        
        if response.status_code != 200:
            log_test_result("Statistics", False, f"Status: {response.status_code}")
            return False
            
        stats = response.json()
        
        required_fields = ["total", "active", "returned", "cancelled"]
        missing_fields = [field for field in required_fields if field not in stats]
        
        if missing_fields:
            log_test_result("Statistics", False, f"Missing fields: {missing_fields}")
            return False
            
        # Verify all values are integers
        if not all(isinstance(stats[field], int) for field in required_fields):
            log_test_result("Statistics", False, "Non-integer values in statistics")
            return False
            
        log_test_result("Statistics", True, f"Stats: {stats}")
        return True
        
    except Exception as e:
        log_test_result("Statistics", False, f"Error: {str(e)}")
        return False

def run_all_tests():
    """Run comprehensive test suite"""
    print("="*80)
    print("CAM-TGU Equipment Loan System - Backend API Test Suite")
    print(f"Testing against: {API_BASE}")
    print("="*80)
    print()
    
    test_results = {}
    test_loan_id = None
    
    # Test 1: Health Check
    test_results['health'] = test_health_check()
    
    # Test 2: Create Loan (and get ID for subsequent tests)
    test_loan_id, test_results['create'] = test_create_loan()
    
    # Test 3: Get All Loans
    test_results['get_all'] = test_get_all_loans()
    
    # Test 4: Get Loans with Filter
    test_results['get_filtered'] = test_get_loans_with_filter()
    
    # Test 5: Get Single Loan (if we have a valid ID)
    if test_loan_id:
        test_results['get_single'] = test_get_single_loan(test_loan_id)
    else:
        test_results['get_single'] = False
    
    # Test 6: Get Non-existent Loan (404 test)
    test_results['get_404'] = test_get_nonexistent_loan()
    
    # Test 7: Update Loan (if we have a valid ID)
    if test_loan_id:
        test_results['update'] = test_update_loan(test_loan_id)
    else:
        test_results['update'] = False
    
    # Test 8: Update Non-existent Loan (404 test)
    test_results['update_404'] = test_update_nonexistent_loan()
    
    # Test 9: Update Loan Status (if we have a valid ID)
    if test_loan_id:
        test_results['status_update'] = test_update_loan_status(test_loan_id)
    else:
        test_results['status_update'] = False
    
    # Test 10: Update Status with Invalid Value (400 test)
    test_results['status_invalid'] = test_update_loan_status_invalid()
    
    # Test 11: Update Status Non-existent Loan (404 test)  
    test_results['status_404'] = test_update_status_nonexistent_loan()
    
    # Test 12: Delete Loan
    test_results['delete'] = test_delete_loan()
    
    # Test 13: Delete Non-existent Loan (404 test)
    test_results['delete_404'] = test_delete_nonexistent_loan()
    
    # Test 14: Statistics
    test_results['stats'] = test_statistics()
    
    # Summary
    print("="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for result in test_results.values() if result)
    total = len(test_results)
    
    print(f"Tests Passed: {passed}/{total}")
    print()
    
    if passed == total:
        print("🎉 ALL TESTS PASSED! Backend API is fully functional.")
    else:
        print("❌ Some tests failed. Check the details above.")
        print("\nFailed tests:")
        for test_name, result in test_results.items():
            if not result:
                print(f"  - {test_name}")
    
    print("="*80)
    return test_results

if __name__ == "__main__":
    run_all_tests()