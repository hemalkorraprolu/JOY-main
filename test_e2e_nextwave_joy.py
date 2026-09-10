"""Comprehensive End-to-End Test Suite for Next Wave Summit Joy Assistant & Knowledge Studio."""

import json
import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import database as db
import extractors
from rag_engine import MISSING_KNOWLEDGE_RESPONSE, build_rag_context_and_citations, search_knowledge_base
from voice_adapters import NeutralEdgeTTSAdapter


class TestE2ENextWaveJoy(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        db.init_db()

    def test_01_upload_dummy_event_knowledge(self):
        """Phase 1: Test creating and indexing dummy event knowledge."""
        doc_id = db.create_document({
            "title": "Next Wave Summit 2026 Official Keynote Schedule",
            "category": "schedule",
            "source": "Event Organising Committee, 12 Sep 2026",
            "date": "2026-09-12",
            "visibility": "public",
            "published": True,
            "status": "ready"
        })
        self.assertIsNotNone(doc_id)

        dummy_text = (
            "The Next Wave Summit 2026 opening ceremony begins at 09:00 AM at the Main Convention Center, Hall A. "
            "Keynote address on Decarbonizing AI Compute Clusters will be delivered by Dr. Vikram Sethi. "
            "Registration counter opens at 08:00 AM with badge pickup requiring official photo ID."
        )

        chunks = extractors.chunk_text(dummy_text, chunk_size=100)
        chunk_list = [{"text": c} for c in chunks]
        db.add_document_chunks(doc_id, chunk_list)

        docs = db.list_documents()
        self.assertTrue(any(d["title"] == "Next Wave Summit 2026 Official Keynote Schedule" for d in docs))

    def test_02_create_dummy_speaker_profile(self):
        """Phase 2: Test creating dummy speaker profile in Knowledge Studio."""
        spk_id = db.create_speaker({
            "full_name": "Dr. Vikram Sethi",
            "role": "Chief AI Sustainability Officer",
            "organization": "ComputeZero Labs",
            "short_bio": "Researches carbon-aware dynamic scheduling for large-scale GPU clusters.",
            "topics": "Decarbonizing AI, Microgrids, Green Compute",
            "visibility": "public",
            "approval_status": "approved"
        })
        self.assertIsNotNone(spk_id)

        speakers = db.list_speakers(public_only=True)
        self.assertTrue(any(s["full_name"] == "Dr. Vikram Sethi" for s in speakers))

    def test_03_rag_query_with_citations(self):
        """Phase 3: Test querying Joy for real purpose with dummy data to verify citations."""
        query = "What time does registration open and who is delivering the keynote?"
        context, citations, has_knowledge = build_rag_context_and_citations(query)

        self.assertTrue(has_knowledge)
        self.assertIn("08:00 AM", context)
        self.assertIn("Dr. Vikram Sethi", context)
        self.assertTrue(len(citations) > 0)
        self.assertIn("Event Organising Committee", citations[0])

    def test_04_zero_hallucination_disclaimer(self):
        """Phase 4: Test asking unindexed topic to ensure zero hallucination."""
        query = "What is the secret recipe for the summit banquet dinner dessert?"
        context, citations, has_knowledge = build_rag_context_and_citations(query)

        self.assertFalse(has_knowledge)
        self.assertEqual(context, "")
        self.assertEqual(citations, [])

    def test_05_voice_consent_audit(self):
        """Phase 5: Test voice cloning consent audit logger."""
        speakers = db.list_speakers(public_only=True)
        spk_id = speakers[0]["id"]

        log_id = db.log_voice_consent(spk_id, "Dr. Vikram Sethi", "Consent granted for summit voice playback.")
        self.assertIsNotNone(log_id)

        logs = db.list_voice_consent_logs(spk_id)
        self.assertTrue(len(logs) > 0)
        self.assertEqual(logs[0]["consented_by"], "Dr. Vikram Sethi")

    def test_06_open_source_tts(self):
        """Phase 6: Test open-source server-side voice synthesis."""
        import asyncio
        adapter = NeutralEdgeTTSAdapter()
        audio_bytes = asyncio.run(adapter.synthesize("Welcome to the Next Wave Summit.", language="en"))
        self.assertGreater(len(audio_bytes), 1000)



if __name__ == "__main__":
    unittest.main()
