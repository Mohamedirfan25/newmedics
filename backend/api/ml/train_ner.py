# train_ner.py - simplified; create training data manually as list of (text, {"entities":[(start,end,label),...]})
import spacy
from spacy.util import minibatch, compounding
import random
import json

TRAIN_DATA = [
  ("Dolo-650 Paracetamol 650mg Tablet", {"entities":[(0,7,"BRAND"),(8,18,"GENERIC"),(19,26,"STRENGTH")]}),
  # add more labeled examples...
]

nlp = spacy.blank("en")
if "ner" not in nlp.pipe_names:
    ner = nlp.add_pipe("ner")
else:
    ner = nlp.get_pipe("ner")

for _, annotations in TRAIN_DATA:
    for ent in annotations.get("entities"):
        ner.add_label(ent[2])

optimizer = nlp.begin_training()
for itn in range(20):
    random.shuffle(TRAIN_DATA)
    losses = {}
    batches = minibatch(TRAIN_DATA, size=compounding(4.0, 32.0, 1.001))
    for batch in batches:
        texts, annotations = zip(*batch)
        nlp.update(texts, annotations, sgd=optimizer, drop=0.35, losses=losses)
    print("Losses", losses)

nlp.to_disk("api/ml/ner_model")
