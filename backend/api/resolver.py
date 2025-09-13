# api/resolver.py
import pandas as pd
import re
from rapidfuzz import fuzz, process

CATALOG_PATH = "api/seed_data/medicines.csv"

def load_catalog():
    """Load the medicine catalog from CSV."""
    try:
        df = pd.read_csv(CATALOG_PATH)
        return df
    except Exception as e:
        print(f"Error loading catalog: {e}")
        return pd.DataFrame()

def fuzzy_lookup(raw_text, min_confidence=40):
    """
    Find fuzzy matches for medicine names in the catalog.
    
    Args:
        raw_text (str): The text to search for
        min_confidence (int): Minimum confidence score (0-100)
        
    Returns:
        list: List of matching medicine dictionaries with match scores
    """
    df = load_catalog()
    if df.empty:
        return []
    
    # Clean and normalize input
    raw_text = re.sub(r'[^\w\s\-\+\.]', ' ', str(raw_text))
    raw_text = raw_text.lower().strip()
    raw_text = re.sub(r'\s+', ' ', raw_text)
    
    if len(raw_text) < 3:
        return []
    
    # Prepare choices for fuzzy matching
    choices = []
    for _, row in df.iterrows():
        brand_name = str(row.get('brand_name', '')).lower()
        generic = str(row.get('generic', '')).lower()
        aliases = [a.strip().lower() for a in str(row.get('aliases', '')).split(',') if a.strip()]
        
        # Add all possible name variations
        choices.append({
            'id': len(choices),
            'name': f"{brand_name} ({generic})" if generic else brand_name,
            'brand_name': brand_name,
            'generic': generic,
            'aliases': aliases,
            'row': row.to_dict()
        })
    
    # Extract just the names for fuzzy matching
    choice_names = [c['name'] for c in choices]
    
    # Perform fuzzy matching
    results = process.extract(
        raw_text,
        choice_names,
        scorer=fuzz.WRatio,
        limit=10,
        score_cutoff=min_confidence
    )
    
    # Prepare results
    matches = []
    for result in results:
        choice = choices[result[2]]  # Get the original choice using the index
        if result[1] >= min_confidence:  # Only include matches above threshold
            match = choice['row'].copy()
            match['match_score'] = result[1] / 100  # Convert to 0-1 scale
            matches.append(match)
    
    # Sort by match score (highest first)
    matches.sort(key=lambda x: x.get('match_score', 0), reverse=True)
    
    return matches

def extract_medicines_from_text(text):
    """
    Extract medicine information from prescription text.
    
    Args:
        text (str): The OCR-extracted text from the prescription
        
    Returns:
        list: List of dictionaries containing extracted medicine information
    """
    print("\n" + "="*80)
    print("STARTING MEDICINE EXTRACTION")
    print("="*80)
    print(f"Original text:\n{text}\n" + "-" * 40)
    
    # Clean and preprocess the text
    text = re.sub(r'(?<=\d)(?=[a-zA-Z])', ' ', text)  # Add space between number and letter
    text = re.sub(r'(?<=[a-zA-Z])(?=\d)', ' ', text)  # Add space between letter and number
    text = re.sub(r'([a-z])([A-Z])', r'\1 \2', text)  # Add space between lowercase and uppercase
    text = re.sub(r'([^\w\s])', r' \1 ', text)  # Add spaces around special characters
    text = re.sub(r'\s+', ' ', text).strip()  # Normalize spaces
    
    print(f"Cleaned text for processing:\n{text}\n" + "-" * 40)
    
    # Define patterns for different medicine formats
    medicine_patterns = [
        # Pattern 1: Number. MedicineName Strength - Instructions (e.g., "1. Metformin 500mg - Take once daily")
        r'\b(\d+)\.?\s*([A-Z][a-zA-Z]+)\s+(\d+\s*(?:mg|mcg|g|ml|IU|%|mg\/ml|mcg\/ml|g\/ml|mg\/g|mcg\/g|g\/g|%\/ml|%\/g)?)\s*-?\s*(.*?)(?=\d+\.|$)',
        
        # Pattern 2: MedicineName (Generic) Strength - Instructions
        r'\b([A-Z][a-zA-Z]+)\s*\(([a-zA-Z\s]+)\)\s*(\d+\s*(?:mg|mcg|g|ml|IU|%|mg\/ml|mcg\/ml|g\/ml|mg\/g|mcg\/g|g\/g|%\/ml|%\/g)?)\s*-?\s*(.*?)(?=\d+\.|$)',
        
        # Pattern 3: MedicineName Strength - Instructions (without number)
        r'\b([A-Z][a-zA-Z]+)\s+(\d+\s*(?:mg|mcg|g|ml|IU|%|mg\/ml|mcg\/ml|g\/ml|mg\/g|mcg\/g|g\/g|%\/ml|%\/g)?)\s*-?\s*(.*?)(?=\d+\.|$)'
    ]
    
    # Common frequency terms
    frequency_terms = {
        'once': 'Once daily',
        'twice': 'Twice daily',
        'thrice': 'Three times daily',
        'daily': 'Once daily',
        'nightly': 'At night',
        'morning': 'In the morning',
        'evening': 'In the evening',
        'bedtime': 'At bedtime',
        'hs': 'At bedtime',
        'qhs': 'At bedtime',
        'ac': 'Before meals',
        'pc': 'After meals',
        'prn': 'As needed',
        'sos': 'As needed',
        'qd': 'Once daily',
        'bid': 'Twice daily',
        'tid': 'Three times daily',
        'qid': 'Four times daily',
        'qod': 'Every other day'
    }
    
    medicines = []
    
    # Try each pattern to extract medicines
    for pattern in medicine_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            groups = [g.strip() if g else '' for g in match.groups()]
            
            # Extract medicine details based on pattern
            if len(groups) >= 4:  # Pattern 1 or 2
                if groups[0].isdigit():  # Pattern 1
                    name = groups[1]
                    strength = groups[2]
                    instructions = groups[3]
                    generic = ''
                else:  # Pattern 2
                    name = groups[0]
                    generic = groups[1]
                    strength = groups[2]
                    instructions = groups[3] if len(groups) > 3 else ''
            else:  # Pattern 3
                name = groups[0]
                strength = groups[1] if len(groups) > 1 else ''
                instructions = groups[2] if len(groups) > 2 else ''
                generic = ''
            
            # Extract frequency from instructions
            frequency = 'As directed'
            for term, freq in frequency_terms.items():
                if term.lower() in instructions.lower():
                    frequency = freq
                    break
            
            # Create medicine dictionary
            medicine = {
                'brand_name': name,
                'generic': generic or name,
                'prescribed_dosage': strength,
                'prescribed_timing': frequency,
                'instructions': instructions,
                'match_score': 1.0
            }
            
            # Add to medicines list if not already present
            medicine_key = f"{name.lower()}_{strength.lower()}"
            if medicine_key not in [f"{m['brand_name'].lower()}_{m['prescribed_dosage'].lower()}" for m in medicines]:
                medicines.append(medicine)
                print(f"Found medicine: {name} {strength} - {frequency}")
    
    print("\n" + "="*80)
    print(f"Extracted {len(medicines)} medicines")
    return medicines