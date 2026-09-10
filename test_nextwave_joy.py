"""Verification test suite for Next Wave Summit Joy Assistant & Knowledge Studio."""
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import database as db
import extractors
from rag_engine import MISSING_KNOWLEDGE_RESPONSE, build_rag_context_and_citations, search_knowledge_base
from voice_adapters import NeutralEdgeTTSAdapter


class TestNextWaveJoy(unittest.TestCase):

    def setUp(self):
        db.init_db()

    def test_01_database_and_documents(self):
        doc_id = db.create_document({
            "title": "Summit Schedule 2026",
            "category": "schedule",
            "source": "Official Committee",
            "date": "2026-09-12",
            "visibility": "public",
            "published": True
        })
        self.assertIsNotNone(doc_id)

        db.add_document_chunks(doc_id, [
            {"text": "Keynote on AI Energy Grids by Dr. Elena commences at 09:00 AM in Main Auditorium."},
            {"text": "Student paper presentation track starts at 02:00 PM in Hall B."}
        ])

        docs = db.list_documents()
        self.assertGreaterEqual(len(docs), 1)

    def test_02_speaker_library(self):
        spk_id = db.create_speaker({
            "full_name": "Dr. Ananya Sharma",
            "role": "Lead Architect",
            "organization": "Green Compute Labs",
            "short_bio": "Pioneer in carbon-aware AI scheduling algorithms.",
            "topics": "Green AI, Carbon Intensity, Microgrids"
        })
        self.assertIsNotNone(spk_id)

        speakers = db.list_speakers(public_only=True)
        self.assertTrue(any(s["full_name"] == "Dr. Ananya Sharma" for s in speakers))

    def test_03_rag_retrieval(self):
        results = search_knowledge_base("Dr. Ananya Sharma", top_k=2)
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("Ananya", results[0]["text"])

    def test_04_zero_hallucination_fallback(self):
        context, citations, has_knowledge = build_rag_context_and_citations("Unrelated Quantum Rocket Engines Query")
        self.assertFalse(has_knowledge)
        self.assertEqual(context, "")

    def test_05_chunk_extraction(self):
        text = "Paragraph 1\n\nParagraph 2\n\nParagraph 3"
        chunks = extractors.chunk_text(text, chunk_size=100)
        self.assertGreaterEqual(len(chunks), 1)


if __name__ == "__main__":
    unittest.main()
