#!/bin/bash

# End-to-End API Testing Script
# Tests the key API endpoints against the running backend

BACKEND_URL="http://localhost:8000"
API_BASE="$BACKEND_URL/api/v1"

echo "🚀 Starting End-to-End API Tests..."
echo "Backend URL: $BACKEND_URL"
echo "API Base: $API_BASE"
echo ""

# Test counters
PASSED=0
FAILED=0

test_api() {
    local test_name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local method="${4:-GET}"
    
    echo -n "Testing: $test_name ... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$url")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "$url")
    fi
    
    # Extract HTTP status
    http_status=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed -E 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$http_status" = "$expected_status" ]; then
        echo "✅ PASSED (HTTP $http_status)"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAILED (Expected HTTP $expected_status, got HTTP $http_status)"
        if [ -n "$body" ] && [ ${#body} -lt 200 ]; then
            echo "   Response: $body"
        fi
        FAILED=$((FAILED + 1))
    fi
}

echo "📡 Testing Basic Connectivity..."
test_api "Backend Health Check" "$BACKEND_URL/health" 200
test_api "API Root Endpoint" "$BACKEND_URL/" 200

echo ""
echo "🔗 Testing Corrected Endpoints..."
test_api "Public Persons API (/public-persons)" "$API_BASE/public-persons?skip=0&limit=5" 200
test_api "Media Descriptions API" "$API_BASE/media-descriptions?skip=0&limit=5" 200
test_api "Programs API" "$API_BASE/programs?skip=0&limit=5" 200
test_api "Seasons API" "$API_BASE/seasons?skip=0&limit=5" 200
test_api "Languages API" "$API_BASE/languages?skip=0&limit=5" 200
test_api "Countries API" "$API_BASE/countries?skip=0&limit=5" 200
test_api "Pictures API" "$API_BASE/pictures?skip=0&limit=5" 200
test_api "Content Lists API" "$API_BASE/content-lists?skip=0&limit=5" 200
test_api "Screen Descriptions API" "$API_BASE/screen-descriptions?skip=0&limit=5" 200

echo ""
echo "🔐 Testing Auth Required Endpoints (expect 401)..."
test_api "Users API (Auth Required)" "$API_BASE/users?skip=0&limit=5" 401
test_api "Upload Backends (Auth Required)" "$API_BASE/upload/backends" 401

echo ""
echo "📤 Testing Upload Endpoints Exist (expect 401 not 404)..."
test_api "Video Upload Endpoint Exists" "$API_BASE/upload/video" 401 POST
test_api "Webcomic Upload Endpoint Exists" "$API_BASE/upload/webcomic" 401 POST

echo ""
echo "🔍 Testing Specific IDs..."
test_api "Public Person by ID (Not Found OK)" "$API_BASE/public-persons/nonexistent-id" 404
test_api "Media Description by ID (Not Found OK)" "$API_BASE/media-descriptions/nonexistent-id" 404

echo ""
echo "❌ Testing Wrong URLs (should fail with 404)..."
test_api "OLD Persons URL Should Fail" "$API_BASE/persons?skip=0&limit=5" 404

echo ""
echo "📊 Test Results Summary:"
echo "==============================="
echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo "📊 Total:  $((PASSED + FAILED))"

if [ $((PASSED + FAILED)) -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED * 100) / (PASSED + FAILED) ))
    echo "🎯 Success Rate: ${SUCCESS_RATE}%"
fi

echo ""
if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed! The shared package API is correctly aligned with the backend."
else
    echo "⚠️  Some tests failed. Check the backend implementation or shared package API."
fi

# Return exit code based on results
exit $FAILED