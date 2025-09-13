# api/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import OCRSerializer
from .ocr_utils import ocr_image_bytes
from .resolver import fuzzy_lookup, extract_medicines_from_text
import io

class OCRView(APIView):
    def post(self, request):
        ser = OCRSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        img = ser.validated_data["image"]
        bytes_data = img.read()
        try:
            text = ocr_image_bytes(bytes_data)
        except Exception as e:
            return Response({"error":"ocr_failed", "detail": str(e)}, status=500)
        return Response({"raw_text": text})

class ResolveView(APIView):
    def post(self, request):
        text = request.data.get("text", "")
        if not text:
            return Response({"error":"no_text"}, status=400)
        matches = fuzzy_lookup(text)
        # return top match as primary
        return Response({"matches": matches})

class StripProcessView(APIView):
    def post(self, request):
        ser = OCRSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        
        img = ser.validated_data["image"]
        bytes_data = img.read()
        
        try:
            # First perform OCR on the strip image
            text = ocr_image_bytes(bytes_data)
            print(f"Debug - OCR Result: {text}")
            
            # Clean up the text
            text = re.sub(r'[^\w\s\-\+\/\.]', ' ', text)  # Keep basic punctuation
            text = text.replace('\n', ' ')  # Convert newlines to spaces
            text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
            print(f"Debug - Cleaned text: {text}")
            
            # Try different text segmentation approaches
            all_matches = []
            
            # 1. Try word groups (3-4 words at a time)
            words = text.split()
            for i in range(len(words)):
                for j in range(i+1, min(i+5, len(words)+1)):
                    segment = ' '.join(words[i:j])
                    if len(segment) >= 3:  # Only try segments of reasonable length
                        matches = fuzzy_lookup(segment, min_confidence=45)
                        if matches:
                            all_matches.extend(matches)
                            
            # 2. Try individual words that look like medicine names
            for word in words:
                if (len(word) >= 4 and  # Only try words of reasonable length
                    not any(c.isdigit() for c in word) and  # Skip numbers
                    not word.lower() in {'tablet', 'strip', 'mg', 'ml'}):  # Skip common non-medicine words
                    matches = fuzzy_lookup(word, min_confidence=70)  # Higher confidence for single words
                    if matches:
                        all_matches.extend(matches)
            
            # Remove duplicates while preserving order
            seen = set()
            unique_matches = []
            for match in all_matches:
                if match['brand_name'] not in seen:
                    seen.add(match['brand_name'])
                    unique_matches.append(match)
            
            return Response({
                "raw_text": text,
                "medicines": unique_matches
            })
            
        except Exception as e:
            print(f"Debug - Error processing: {str(e)}")
            return Response(
                {"error": "processing_failed", "detail": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PrescriptionProcessView(APIView):
    def post(self, request):
        ser = OCRSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        
        img = ser.validated_data["image"]
        bytes_data = img.read()
        
        try:
            # First perform OCR on the prescription image
            text = ocr_image_bytes(bytes_data)
            print(f"Debug - Prescription OCR Result: {text}")
            
            # Extract and match medicines from the text
            medicines = extract_medicines_from_text(text)
            
            return Response({
                "raw_text": text,
                "medicines": medicines
            })
            
        except Exception as e:
            print(f"Debug - Error processing prescription: {str(e)}")
            return Response(
                {"error": "processing_failed", "detail": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


import cv2
import numpy as np
import pytesseract
import re
from PIL import Image
from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(["POST"])
def ocr_view(request):
    file = request.FILES.get("image")
    if not file:
        return Response({"error": "No image provided"}, status=400)

    # Convert to OpenCV image
    img = Image.open(file).convert("RGB")
    img = np.array(img)

    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Threshold (black & white)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Noise removal
    denoised = cv2.medianBlur(thresh, 3)

    # Optional: Sharpening
    kernel = np.array([[0, -1, 0],
                       [-1, 5,-1],
                       [0, -1, 0]])
    sharp = cv2.filter2D(denoised, -1, kernel)

    # OCR
    # Use a more flexible OCR configuration
    custom_config = r'--oem 3 --psm 6 -c preserve_interword_spaces=1'
    text = pytesseract.image_to_string(sharp, config=custom_config)
    
    # Clean up common OCR artifacts
    text = re.sub(r'[^\w\s\-\+\/\n\.]', ' ', text)  # Keep only alphanumeric, basic punctuation
    text = re.sub(r'\s+', ' ', text)  # Normalize whitespace
    text = text.strip()

    return Response({"raw_text": text})
