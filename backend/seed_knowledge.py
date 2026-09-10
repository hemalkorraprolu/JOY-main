"""Seed script for Next Wave Summit official knowledge base."""
import sqlite3
import os
import database as db

DB_PATH = os.path.join(os.path.dirname(__file__), "knowledge.db")

def seed_db():
    db.init_db()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Clear old test dummy data
    cur.execute("DELETE FROM documents")
    cur.execute("DELETE FROM document_chunks")
    cur.execute("DELETE FROM speaker_profiles")
    conn.commit()
    conn.close()

    print("Cleaned old test data.")

    # 1. Add official Next Wave Summit schedule & overview document
    doc_id = db.create_document({
        "title": "Next Wave Summit 2026 Official Event Overview & Schedule",
        "category": "general",
        "source": "Next Wave Summit Organising Committee",
        "date": "2026-09-10",
        "visibility": "public",
        "published": True,
        "status": "ready",
        "notes": "Official event guide for all attendees, speakers, and visitors."
    })

    overview_chunks = [
        "Welcome to Next Wave Summit 2026! Next Wave Summit is the flagship global conference dedicated to artificial intelligence, sustainable computing, decarbonizing neural networks, clean energy datacenters, and green silicon architectures.",
        "Next Wave Summit 2026 Schedule Highlights: Day 1 features Keynote Speeches on Carbon-Aware Neural Reasoning and Green Silicon. Day 2 features Student Research Papers, Panel Discussions on Energy Grid Integration, and the AI Podcaster Live Stage with Joy.",
        "Event Logistics & Venue: Next Wave Summit takes place at the Tech Horizon Convention Center, Grand Hall A & B. Registration opens daily at 8:30 AM. Wi-Fi network: NextWave2026_Guest.",
        "Joy is the official AI assistant for Next Wave Summit 2026. Joy provides instant information on session schedules, speaker bios, research tracks, and interactive podcast interviews for speakers and participants."
    ]

    db.add_document_chunks(
        document_id=doc_id,
        chunks=[{"text": text} for text in overview_chunks]
    )

    print("Added event overview document.")

    # 2. Add official speaker profiles
    speakers_data = [
        {
            "full_name": "Dr. Sarah Lin",
            "role": "Chief AI Sustainability Officer",
            "organization": "GreenCompute Labs",
            "short_bio": "Pioneer in Carbon-Aware Neural Reasoning and Sparse Compute Architectures.",
            "long_background": "Dr. Sarah Lin leads research cutting LLM training carbon intensity by 45% using dynamic energy-shifting neural networks.",
            "achievements": "Keynote speaker at Next Wave Summit 2026 on Clean Silicon & Energy-Aware AI.",
            "topics": "Carbon-Aware AI, Sparse Compute, Green Datacenters",
            "approval_status": "approved",
            "visibility": "public"
        },
        {
            "full_name": "Prof. Marcus Vance",
            "role": "Clean Energy & Compute Systems Lead",
            "organization": "Institute for Renewable Computing",
            "short_bio": "Leading researcher in dynamic renewable load-shifting for AI clusters and geothermal datacenter integration.",
            "long_background": "Prof. Marcus Vance's work focuses on thermal waste-heat recapture networks and zero-carbon datacenter grid integration.",
            "achievements": "Keynote speaker at Next Wave Summit 2026 on Zero-Carbon Computing Systems.",
            "topics": "Renewable Load-Shifting, Geothermal Datacenters, Thermal Waste-Heat Recapture",
            "approval_status": "approved",
            "visibility": "public"
        }
    ]

    for spk in speakers_data:
        db.create_speaker(spk)

    print("Added official speaker profiles successfully!")

if __name__ == "__main__":
    seed_db()
