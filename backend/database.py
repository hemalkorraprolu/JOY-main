"""Database module for Next Wave Summit Joy Assistant & Knowledge Studio.
Provides SQLite storage for event knowledge documents, RAG chunks, speaker library, and voice consent audit logs.
"""

import os
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "knowledge.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes SQLite database tables and indexes."""
    conn = get_db()
    cursor = conn.cursor()

    # Document table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        source TEXT DEFAULT '',
        date TEXT DEFAULT '',
        visibility TEXT NOT NULL DEFAULT 'public',
        published INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'ready',
        notes TEXT DEFAULT '',
        filename TEXT DEFAULT '',
        file_type TEXT DEFAULT '',
        file_path TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )
    """)

    # Chunks table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        speaker_id TEXT DEFAULT '',
        title TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'general',
        source TEXT DEFAULT '',
        text TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'public',
        published INTEGER NOT NULL DEFAULT 1,
        chunk_index INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    )
    """)

    # Speaker profile table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS speaker_profiles (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        role TEXT DEFAULT '',
        organization TEXT DEFAULT '',
        short_bio TEXT DEFAULT '',
        long_background TEXT DEFAULT '',
        achievements TEXT DEFAULT '',
        topics TEXT DEFAULT '',
        links TEXT DEFAULT '',
        photo_url TEXT DEFAULT '',
        approval_status TEXT NOT NULL DEFAULT 'approved',
        visibility TEXT NOT NULL DEFAULT 'public',
        created_at TEXT NOT NULL
    )
    """)

    # Speaker document attachments
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS speaker_documents (
        id TEXT PRIMARY KEY,
        speaker_id TEXT NOT NULL,
        title TEXT NOT NULL,
        file_name TEXT DEFAULT '',
        file_path TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (speaker_id) REFERENCES speaker_profiles(id) ON DELETE CASCADE
    )
    """)

    # Voice Consent Audit Log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS voice_consent_logs (
        id TEXT PRIMARY KEY,
        speaker_id TEXT NOT NULL,
        consented_by TEXT NOT NULL,
        consent_notes TEXT DEFAULT '',
        reference_voice_path TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (speaker_id) REFERENCES speaker_profiles(id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()


# --- Document Helpers ---

def create_document(doc_data: Dict[str, Any]) -> str:
    conn = get_db()
    cursor = conn.cursor()
    doc_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO documents (id, title, category, source, date, visibility, published, status, notes, filename, file_type, file_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        doc_id,
        doc_data.get("title", "Untitled Document"),
        doc_data.get("category", "general"),
        doc_data.get("source", ""),
        doc_data.get("date", now[:10]),
        doc_data.get("visibility", "public"),
        1 if doc_data.get("published", True) else 0,
        doc_data.get("status", "ready"),
        doc_data.get("notes", ""),
        doc_data.get("filename", ""),
        doc_data.get("file_type", "txt"),
        doc_data.get("file_path", ""),
        now
    ))
    conn.commit()
    conn.close()
    return doc_id


def add_document_chunks(document_id: str, chunks: List[Dict[str, Any]]) -> None:
    conn = get_db()
    cursor = conn.cursor()
    
    # Get doc metadata
    cursor.execute("SELECT title, category, source, visibility, published FROM documents WHERE id = ?", (document_id,))
    doc = cursor.fetchone()
    title = doc["title"] if doc else "Document"
    category = doc["category"] if doc else "general"
    source = doc["source"] if doc else ""
    visibility = doc["visibility"] if doc else "public"
    published = doc["published"] if doc else 1

    for idx, chunk in enumerate(chunks):
        chunk_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO document_chunks (id, document_id, speaker_id, title, category, source, text, visibility, published, chunk_index)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            chunk_id,
            document_id,
            chunk.get("speaker_id", ""),
            title,
            category,
            source,
            chunk.get("text", ""),
            visibility,
            published,
            idx
        ))
    conn.commit()
    conn.close()


def list_documents() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_document(doc_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_document(doc_id: str, update_data: Dict[str, Any]) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    
    fields = []
    values = []
    for k in ["title", "category", "source", "date", "visibility", "published", "status", "notes"]:
        if k in update_data:
            fields.append(f"{k} = ?")
            val = update_data[k]
            if k == "published":
                val = 1 if val else 0
            values.append(val)
            
    if not fields:
        conn.close()
        return False
        
    values.append(doc_id)
    query = f"UPDATE documents SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, tuple(values))

    # Also update chunks visibility & published status if changed
    if "visibility" in update_data or "published" in update_data:
        cursor.execute("SELECT visibility, published FROM documents WHERE id = ?", (doc_id,))
        doc = cursor.fetchone()
        if doc:
            cursor.execute("UPDATE document_chunks SET visibility = ?, published = ? WHERE document_id = ?",
                           (doc["visibility"], doc["published"], doc_id))
            
    conn.commit()
    conn.close()
    return True


def delete_document(doc_id: str) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM document_chunks WHERE document_id = ?", (doc_id,))
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    return True


def get_published_public_chunks() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM document_chunks WHERE published = 1 AND visibility = 'public'")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_all_chunks_admin() -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM document_chunks")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


# --- Speaker Library Helpers ---

def create_speaker(speaker_data: Dict[str, Any]) -> str:
    conn = get_db()
    cursor = conn.cursor()
    spk_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO speaker_profiles (id, full_name, role, organization, short_bio, long_background, achievements, topics, links, photo_url, approval_status, visibility, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        spk_id,
        speaker_data.get("full_name", "New Speaker"),
        speaker_data.get("role", ""),
        speaker_data.get("organization", ""),
        speaker_data.get("short_bio", ""),
        speaker_data.get("long_background", ""),
        speaker_data.get("achievements", ""),
        speaker_data.get("topics", ""),
        speaker_data.get("links", ""),
        speaker_data.get("photo_url", ""),
        speaker_data.get("approval_status", "approved"),
        speaker_data.get("visibility", "public"),
        now
    ))
    conn.commit()
    conn.close()
    return spk_id


def list_speakers(public_only: bool = True) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    if public_only:
        cursor.execute("SELECT * FROM speaker_profiles WHERE visibility = 'public' AND approval_status = 'approved' ORDER BY full_name ASC")
    else:
        cursor.execute("SELECT * FROM speaker_profiles ORDER BY full_name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_speaker(spk_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM speaker_profiles WHERE id = ?", (spk_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def update_speaker(spk_id: str, update_data: Dict[str, Any]) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    fields = []
    values = []
    allowed_keys = ["full_name", "role", "organization", "short_bio", "long_background", "achievements", "topics", "links", "photo_url", "approval_status", "visibility"]
    for k in allowed_keys:
        if k in update_data:
            fields.append(f"{k} = ?")
            values.append(update_data[k])
    if not fields:
        conn.close()
        return False
    values.append(spk_id)
    cursor.execute(f"UPDATE speaker_profiles SET {', '.join(fields)} WHERE id = ?", tuple(values))
    conn.commit()
    conn.close()
    return True


def delete_speaker(spk_id: str) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM document_chunks WHERE speaker_id = ?", (spk_id,))
    cursor.execute("DELETE FROM speaker_documents WHERE speaker_id = ?", (spk_id,))
    cursor.execute("DELETE FROM voice_consent_logs WHERE speaker_id = ?", (spk_id,))
    cursor.execute("DELETE FROM speaker_profiles WHERE id = ?", (spk_id,))
    conn.commit()
    conn.close()
    return True


def log_voice_consent(speaker_id: str, consented_by: str, notes: str = "", reference_voice_path: str = "") -> str:
    conn = get_db()
    cursor = conn.cursor()
    log_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO voice_consent_logs (id, speaker_id, consented_by, consent_notes, reference_voice_path, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (log_id, speaker_id, consented_by, notes, reference_voice_path, now))
    conn.commit()
    conn.close()
    return log_id


def list_voice_consent_logs(speaker_id: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    if speaker_id:
        cursor.execute("SELECT * FROM voice_consent_logs WHERE speaker_id = ? ORDER BY created_at DESC", (speaker_id,))
    else:
        cursor.execute("SELECT * FROM voice_consent_logs ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

# Initialize DB on module load
init_db()
