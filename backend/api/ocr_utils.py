# api/ocr_utils.py
import cv2
import numpy as np
import pytesseract

# Optional: set tesseract cmd if needed
# pytesseract.pytesseract.tesseract_cmd = r'/usr/bin/tesseract'

def preprocess_image_bytes(file_bytes):
    # file_bytes: bytes from uploaded image
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    # denoise
    gray = cv2.bilateralFilter(gray, 9, 75, 75)
    # adaptive threshold
    th = cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY,31,2)
    # deskew
    coords = np.column_stack(np.where(th > 0))
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    (h, w) = th.shape[:2]
    M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
    rotated = cv2.warpAffine(th, M, (w,h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated

def ocr_image_bytes(file_bytes):
    img = preprocess_image_bytes(file_bytes)
    # Tesseract config
    custom_config = r'--oem 1 --psm 6'
    text = pytesseract.image_to_string(img, config=custom_config)
    return text
