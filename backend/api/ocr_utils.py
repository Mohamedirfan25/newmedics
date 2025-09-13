# api/ocr_utils.py
import cv2
import numpy as np
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import io
import re

# Configure Tesseract path if needed
# pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'

def enhance_image(img):
    """Apply various image enhancements to improve OCR accuracy."""
    # Convert to PIL Image for enhancement
    if isinstance(img, np.ndarray):
        img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    
    # Enhance contrast
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(1.5)
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(img)
    img = enhancer.enhance(2.0)
    
    # Convert back to OpenCV format
    return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)

def remove_noise(image):
    """Remove noise from the image while preserving edges."""
    # Apply bilateral filter for noise reduction while preserving edges
    denoised = cv2.bilateralFilter(image, 9, 75, 75)
    
    # Apply non-local means denoising for better results with color images
    if len(denoised.shape) == 3:  # Color image
        denoised = cv2.fastNlMeansDenoisingColored(denoised, None, 10, 10, 7, 21)
    else:  # Grayscale
        denoised = cv2.fastNlMeansDenoising(denoised, None, 10, 7, 21)
    
    return denoised

def correct_skew(image):
    """Correct image skew using Hough lines."""
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()
    
    # Threshold the image
    thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)[1]
    
    # Find lines using Hough transform
    lines = cv2.HoughLinesP(
        thresh, 1, np.pi/180, 100, minLineLength=100, maxLineGap=10
    )
    
    if lines is not None and len(lines) > 0:
        # Calculate angles of lines
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
            angles.append(angle)
        
        # Get median angle
        median_angle = np.median(angles)
        
        # Rotate image if skew is significant
        if abs(median_angle) > 0.5:  # Only correct if angle > 0.5 degrees
            (h, w) = image.shape[:2]
            center = (w // 2, h // 2)
            M = cv2.getRotationMatrix2D(center, median_angle, 1.0)
            return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    
    return image

def preprocess_image_bytes(file_bytes):
    """Preprocess image for better OCR results."""
    # Convert bytes to numpy array
    nparr = np.frombuffer(file_bytes, np.uint8)
    
    # Read image with OpenCV
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image")
    
    # Store original dimensions for later use
    original_height, original_width = img.shape[:2]
    
    # Resize if image is too large (better for performance and OCR)
    max_dimension = 2000
    scale = min(max_dimension/original_width, max_dimension/original_height, 1.0)
    if scale < 1.0:
        img = cv2.resize(img, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    
    # Enhance image quality
    img = enhance_image(img)
    
    # Convert to grayscale for further processing
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
        cv2.THRESH_BINARY, 31, 5
    )
    
    # Remove noise
    denoised = remove_noise(thresh)
    
    # Correct skew
    deskewed = correct_skew(denoised)
    
    # Apply morphological operations to clean up the image
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    morph = cv2.morphologyEx(deskewed, cv2.MORPH_CLOSE, kernel)
    morph = cv2.morphologyEx(morph, cv2.MORPH_OPEN, kernel)
    
    # Apply sharpening
    kernel = np.array([[-1,-1,-1], 
                       [-1, 9,-1],
                       [-1,-1,-1]])
    sharpened = cv2.filter2D(morph, -1, kernel)
    
    return sharpened

def postprocess_text(text):
    """Clean and format the extracted text."""
    if not text:
        return ""
    
    # Replace common OCR errors
    replacements = {
        '|': 'I',  # Common OCR error for 'I'
        '1': 'I',  # Common OCR error for 'I'
        '0': 'O',  # Common OCR error for 'O'
        '5': 'S',  # Common OCR error for 'S'
        '2': 'Z',  # Common OCR error for 'Z'
    }
    
    # Apply replacements
    for old, new in replacements.items():
        text = text.replace(old, new)
    
    # Remove non-printable characters
    text = ''.join(char for char in text if char.isprintable() or char.isspace())
    
    # Normalize whitespace and clean up line breaks
    text = '\n'.join(' '.join(line.split()) for line in text.split('\n'))
    
    return text.strip()

def ocr_strip_image(file_bytes):
    """Process strip images with specialized settings for medicine strip recognition."""
    try:
        # Convert bytes to image
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            gray, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Use a more permissive OCR configuration for strip images
        custom_config = (
            '--oem 3 '  # LSTM + Legacy OCR Engine
            '--psm 4 '   # Assume a single column of text
            '-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-+/.()[],:;% '  # Whitelist common medical characters
            '--user-words ./api/seed_data/medical_terms.txt '  # Custom dictionary
        )
        
        # Perform OCR
        text = pytesseract.image_to_string(thresh, config=custom_config.strip())
        
        # Clean up the text
        cleaned_text = postprocess_text(text)
        
        return cleaned_text
        
    except Exception as e:
        print(f"Error in ocr_strip_image: {str(e)}")
        # Fall back to regular OCR if strip-specific processing fails
        return ocr_image_bytes(file_bytes)

def ocr_image_bytes(file_bytes):
    """Extract text from image using Tesseract with optimized settings and detailed logging."""
    print("\n" + "="*80)
    print("STARTING OCR PROCESSING")
    print("="*80)
    
    try:
        print("\n[1/6] Converting bytes to image...")
        nparr = np.frombuffer(file_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        print("[2/6] Converting to grayscale...")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        print("[3/6] Applying adaptive thresholding...")
        thresh = cv2.adaptiveThreshold(
            gray, 255, 
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        print("[4/6] Applying dilation to connect text components...")
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2,2))
        dilated = cv2.dilate(thresh, kernel, iterations=1)
        
        # Save preprocessed image for debugging
        debug_img_path = "./debug_preprocessed.png"
        cv2.imwrite(debug_img_path, dilated)
        print(f"[5/6] Saved preprocessed image to: {debug_img_path}")
        
        print("[6/6] Configuring Tesseract OCR...")
        custom_config = (
            '--oem 3 '  # LSTM + Legacy OCR Engine
            '--psm 6 '   # Assume a single uniform block of text
            '-c preserve_interword_spaces=1 '  # Preserve spaces between words
            '-c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-+/.()[],:;% '  # Whitelist common medical characters
            '--user-words ./api/seed_data/medical_terms.txt '  # Custom dictionary
            '-c load_system_dawg=1 '  # Load system dictionary
            '-c load_freq_dawg=1 '    # Load frequent words dictionary
            '-c textord_min_linesize=2.0 '  # Minimum line size
        )
        
        print("\nPerforming OCR with initial settings...")
        text = pytesseract.image_to_string(dilated, config=custom_config.strip())
        
        # If initial OCR doesn't give good results, try with different settings
        if not text or len(text.strip()) < 10:  # If text is too short
            print("Initial OCR results were poor, trying alternative settings...")
            custom_config = custom_config.replace('--psm 6', '--psm 4')  # Assume a single column of text
            text = pytesseract.image_to_string(dilated, config=custom_config.strip())
        
        # Post-process the extracted text
        cleaned_text = postprocess_text(text)
        
        # Debug: Print the extracted text
        print("\n" + "="*80)
        print("EXTRACTED TEXT FROM IMAGE:")
        print("="*80)
        print(cleaned_text)
        print("="*80 + "\n")
        
        # If no text was extracted, try one more time with basic settings
        if not cleaned_text.strip():
            print("No text extracted with optimized settings, trying basic OCR...")
            text = pytesseract.image_to_string(Image.open(io.BytesIO(file_bytes)))
            cleaned_text = postprocess_text(text)
            print("\nBASIC OCR EXTRACTED TEXT:")
            print("-" * 50)
            print(cleaned_text)
            print("-" * 50 + "\n")
        
        return cleaned_text
        
    except Exception as e:
        print(f"\n!!! ERROR in OCR processing: {str(e)}")
        import traceback
        traceback.print_exc()
        
        # Fallback to basic OCR if optimized processing fails
        try:
            print("\nAttempting fallback to basic OCR...")
            text = pytesseract.image_to_string(Image.open(io.BytesIO(file_bytes)))
            cleaned_text = postprocess_text(text)
            print("\nFALLBACK OCR EXTRACTED TEXT:")
            print("-" * 50)
            print(cleaned_text)
            print("-" * 50 + "\n")
            return cleaned_text
        except Exception as fallback_error:
            print(f"!!! Fallback OCR also failed: {str(fallback_error)}")
            traceback.print_exc()
            return ""
