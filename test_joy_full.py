"""End-to-end test for JOY AI Podcaster."""
from dotenv import load_dotenv
import os, asyncio, re, tempfile, edge_tts

load_dotenv(".env")
key = os.environ.get("GROQ_API_KEY", "")

print("=" * 55)
print("TEST 1: Groq API Key Auto-Load")
print("=" * 55)
if key and not key.startswith("your_"):
    print(f"  KEY: {key[:12]}...{key[-4:]}  OK")
else:
    print("  ERROR: No key found")

print()
print("=" * 55)
print("TEST 2: Opening Podcast Question Quality")
print("=" * 55)
from groq import Groq
client = Groq(api_key=key)

system_prompt = (
    "You are JOY, an authentic AI podcast co-host at Next Wave: AI & Sustainability Summit.\n"
    "CORE RULES: 20-45 words max. No bullet points. Voice-ready (no markdown symbols).\n"
    "FORMAT: <think>..reasoning..</think> [spoken response]"
)
opening_prompt = (
    'Generate a broadcast-ready 2-sentence podcast host opening for Next Wave: AI & Sustainability Summit.\n'
    'Featured Guest: Dr. Sarah Lin (Chief AI Sustainability Officer). '
    'Bio: Specializes in Carbon-Aware Neural Reasoning. Cuts LLM training carbon intensity by 45%.\n'
    'RULES: Welcome audience, introduce Dr. Sarah Lin, ask a sharp opening question citing her research. Max 40 words.'
)
resp = client.chat.completions.create(
    model="qwen/qwen3.6-27b",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": opening_prompt}
    ],
    temperature=0.7, max_tokens=400
)
raw = resp.choices[0].message.content
spoken_opening = re.sub(r"<think>[\s\S]*?</think>", "", raw, flags=re.IGNORECASE).strip()
word_count = len(spoken_opening.split())
print(f"  Opening Message ({word_count} words):")
print(f'  "{spoken_opening}"')
chatbot_markers = ["feel free", "suggest a question", "any doubts", "how can I help"]
is_podcast_style = not any(m in spoken_opening.lower() for m in chatbot_markers)
print(f"  Podcast style (not chatbot): {'PASS' if is_podcast_style else 'FAIL'}")
print(f"  Word count (target 20-50): {'PASS' if 15 <= word_count <= 60 else 'WARN'}")

print()
print("=" * 55)
print("TEST 3: Follow-up Conversation Quality")
print("=" * 55)
resp2 = client.chat.completions.create(
    model="qwen/qwen3.6-27b",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": "[Dr. Sarah Lin]: Carbon-aware scheduling reduces training emissions by 45 percent by shifting workloads to off-peak renewable windows."}
    ],
    temperature=0.7, max_tokens=300
)
spoken2 = re.sub(r"<think>[\s\S]*?</think>", "", resp2.choices[0].message.content, flags=re.IGNORECASE).strip()
word_count2 = len(spoken2.split())
print(f"  JOY Reply ({word_count2} words):")
print(f'  "{spoken2}"')
print(f"  Word count (target 20-45): {'PASS' if 15 <= word_count2 <= 55 else 'WARN'}")

print()
print("=" * 55)
print("TEST 4: Edge-TTS Neural Voice Synthesis")
print("=" * 55)

async def run_all_tts():
    tests = [
        (spoken_opening[:120], "en-US-AvaNeural", "Alex persona - AvaNeural"),
        ("Loud and clear! What breakthrough are you most excited to explore today?", "en-US-JennyNeural", "Elena persona - JennyNeural"),
        ("Wait, so if you shift loads to renewable windows, what happens during grid instability?", "en-US-AriaNeural", "Marcus persona - AriaNeural"),
    ]
    for text, voice, label in tests:
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as tmp:
                path = tmp.name
            comm = edge_tts.Communicate(text, voice)
            await comm.save(path)
            size = os.path.getsize(path)
            os.unlink(path)
            print(f"  {label}: {size:,} bytes  PASS")
        except Exception as e:
            print(f"  {label}: FAILED - {e}")

asyncio.run(run_all_tts())

print()
print("=" * 55)
print("TEST 5: Backend JSON response structure")
print("=" * 55)
result = resp.model_dump()
has_content = "choices" in result and len(result["choices"]) > 0 and "content" in result["choices"][0]["message"]
print(f"  choices[0].message.content present: {'PASS' if has_content else 'FAIL'}")
print(f"  Model used: {result.get('model', 'unknown')}")

print()
print("=" * 55)
print("ALL TESTS COMPLETE")
print("=" * 55)
