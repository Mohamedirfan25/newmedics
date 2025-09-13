# api/urls.py
from django.urls import path
from .views import OCRView, ResolveView, StripProcessView, PrescriptionProcessView, debug_ocr

urlpatterns = [
    path("ocr/", OCRView.as_view(), name="ocr"),
    path("resolve/", ResolveView.as_view(), name="resolve"),
    path("process-strip/", StripProcessView.as_view(), name="process-strip"),
    path("process-prescription/", PrescriptionProcessView.as_view(), name="process-prescription"),
    path("debug-ocr/", debug_ocr, name="debug-ocr"),
]
