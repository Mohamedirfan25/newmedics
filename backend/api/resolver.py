# api/resolver.py
import pandas as pd
from rapidfuzz import fuzz, process
import re

CATALOG_PATH = "api/seed_data/medicines.csv"

def load_catalog():
    df = pd.read_csv(CATALOG_PATH)
    return df

def fuzzy_lookup(raw_text, min_confidence=40):
    df = load_catalog()
    raw_text = re.sub(r'[^\w\s\-\+]', ' ', raw_text)
    raw_text = raw_text.lower().strip()
    raw_text = re.sub(r'\s+', ' ', raw_text)
    
    if len(raw_text) < 3:
        return []
    
    common_words = {
        'tab', 'tablet', 'tablets', 'cap', 'capsule', 'capsules',
        'injection', 'syrup', 'drops', 'cream', 'ointment', 'gel',
        'mg', 'ml', 'mcg', 'g', 'kg', 'units',
        'daily', 'twice', 'thrice', 'times', 'dose', 'take',
        'morning', 'noon', 'night', 'evening', 'before', 'after',
        'meal', 'meals', 'empty', 'stomach', 'medicine', 'prescription',
        'drug', 'generic', 'salt', 'patient', 'name', 'address', 'age',
        'date', 'doctor', 'dr', 'hospital', 'clinic', 'pharmacy'
    }
    
    if raw_text in common_words:
        return []
    
    choices = []
    aliases = []
    for idx, row in df.iterrows():
        brand_name = str(row["brand_name"]).lower()
        generic = str(row["generic"]).lower()
        alias = str(row.get("aliases", "")).lower()
        
        choices.append(f"{brand_name}||{generic}")
        aliases.append(alias.split(",") if alias else [])
    
    results = process.extract(raw_text, choices, scorer=fuzz.WRatio, limit=5)
    filtered_results = []
    
    for result in results:
        choice, score, idx = result
        brand = choice.split("||")[0]
        
        required_confidence = min_confidence
        if len(raw_text) < 5:
            required_confidence = 75
        elif len(raw_text) < 8:
            required_confidence = 60
            
        if raw_text in brand.split() or raw_text in aliases[idx]:
            score += 15
            
        if (score >= required_confidence and 
            (raw_text in brand or 
             brand in raw_text or 
             any(raw_text in alias for alias in aliases[idx]) or 
             (len(raw_text) >= 4 and score >= 80))):
            
            row = df.iloc[idx].to_dict()
            row["match_score"] = min(score / 100, 1.0)
            filtered_results.append((row, score))
    
    if not filtered_results:
        return []
    
    sorted_matches = sorted(filtered_results, key=lambda x: x[1], reverse=True)
    seen_brands = set()
    final_matches = []
    
    for match, score in sorted_matches:
        brand = match['brand_name'].lower()
        if brand not in seen_brands:
            seen_brands.add(brand)
            final_matches.append(match)
            if len(final_matches) >= 3:
                break
    
    return final_matches

def extract_medicines_from_text(text):
    text = re.sub(r'[^\w\s\-\+\/]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    text = text.replace('\\n', '\n')
    
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    medicines = []
    seen_medicines = set()
    processed_lines = 0
    max_lines = 50
    max_medicines = 10
    
    ignore_sections = ['prescription', 'patient name', 'age', 'date', 'address', 'doctor', 'hospital']
    
    for line in lines:
        if len(medicines) >= max_medicines or processed_lines >= max_lines:
            break
            
        processed_lines += 1
        line = line.strip().lower()
        
        if not line or len(line) < 3:
            continue
        
        if any(section in line.lower() for section in ignore_sections):
            continue
            
        if not re.search(r'[a-zA-Z]', line):
            continue
            
        medicine_name_match = re.match(r'^[a-zA-Z\s\-]+(?=\d|$)', line)
        matches = None
        
        if medicine_name_match:
            potential_med = medicine_name_match.group(0).strip()
            if len(potential_med) >= 3:
                matches = fuzzy_lookup(potential_med, min_confidence=50)
        
        if not matches:
            words = line.split()
            window_size = min(4, len(words))
            
            while window_size > 0:
                for i in range(len(words) - window_size + 1):
                    potential_med = ' '.join(words[i:i+window_size])
                    if len(potential_med) >= 3:
                        matches = fuzzy_lookup(potential_med, min_confidence=60)
                        if matches:
                            break
                if matches:
                    break
                window_size -= 1
        
        if matches:
            for medicine in matches:
                if medicine["brand_name"].lower() not in seen_medicines:
                    seen_medicines.add(medicine["brand_name"].lower())
                    medicines.append(medicine)
    
    return medicines