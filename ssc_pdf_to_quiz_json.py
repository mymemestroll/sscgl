#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Parse SSC CGL-style PDF into proper JSON array format.

Changes (2025-09-10):
- Output is a single JSON file (array of objects).
- All "hi" fields are empty strings "".
- All "image" fields are empty strings "".
- "assets" always [].
- Merges Answer + Explanation from the final "Answers" section.
"""

import argparse
import json
from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
import pdfplumber
import regex as rex

# ---------------- Config ----------------
SECTION_HEADERS = {
    "GENERAL INTELLIGENCE AND REASONING": "General Intelligence and Reasoning",
    "GENERAL AWARENESS": "General Awareness",
    "QUANTITATIVE APTITUDE": "Quantitative Aptitude",
    "ENGLISH COMPREHENSION": "English Comprehension",
}

QNUM_RE = rex.compile(r"^(\d{1,3})\.\s*(.*)")
OPTION_RE = rex.compile(r"^(?:[a-dA-D][\.\)]|[a-dA-D]\s)\s*(.+)")
MARKS_RE = rex.compile(r"\(\s*\+?\d+\s*,\s*-\s*\d+(\.\d+)?\s*\)")
ANS_LINE_RE = rex.compile(r"^\s*(\d{1,3})\.\s*Answer\s*:\s*([A-D])\s*$", rex.I)
EXPL_HDR_RE = rex.compile(r"^\s*Explanation\s*:\s*$", rex.I)

# ---------------- Models ----------------
@dataclass
class OptionObj:
    key: str
    en: str
    hi: str = ""
    image: str = ""  # always ""

@dataclass
class QuestionObj:
    id: str
    qnum: int
    subject: str
    topic: str
    subtopic: Optional[str]
    difficulty: str
    q_en: str
    q_hi: str
    q_image: str
    options: List[OptionObj]
    answer: str
    explanation_en: str
    explanation_hi: str
    explanation_image: str
    assets: List[str]
    source: str
    tags: List[str]

# ---------------- Helpers ----------------
def clean(t: str) -> str:
    return rex.sub(r"\s+", " ", (t or "")).strip()

def detect_section(line: str) -> Optional[str]:
    L = clean(line).upper()
    for k, v in SECTION_HEADERS.items():
        if k in L:
            return v
    return None

def guess_topic_from_text(subject: str, q_text: str) -> Tuple[str, Optional[str]]:
    ql = q_text.lower()
    topic, subtopic = subject, None
    if subject == "Quantitative Aptitude":
        if "triangle" in ql:
            topic, subtopic = "Geometry", "Triangles"
        elif "average" in ql:
            topic, subtopic = "Averages", None
        elif "ratio" in ql:
            topic, subtopic = "Ratio & Proportion", None
    return topic, subtopic

def extract_source_header(pages_text: List[str]) -> str:
    blob = "\n".join(pages_text[:2])
    m = rex.search(r"(SSC\s+CGL.*?Tier.*?\d{4}.*?Shift\s*\d+)", blob, rex.I | rex.S)
    if m:
        return clean(m.group(1))
    return "SSC CGL Question Paper"

# ---------------- PDF reader ----------------
def read_lines(pdf_path: str) -> List[Tuple[int, str]]:
    out: List[Tuple[int, str]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages):
            text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
            for line in text.splitlines():
                out.append((pno, clean(line)))
    return out

# ---------------- Answer parser ----------------
def parse_answers(lines: List[Tuple[int, str]]) -> Dict[int, Tuple[str, str]]:
    idx = -1
    for i, (_, txt) in enumerate(lines):
        if txt.upper().startswith("ANSWERS"):
            idx = i
            break
    if idx < 0:
        return {}

    ans_map: Dict[int, Tuple[str, str]] = {}
    i = idx + 1
    current_q = None
    current_ans = ""
    collecting = False
    expl_buf: List[str] = []

    while i < len(lines):
        _, txt = lines[i]
        m = ANS_LINE_RE.match(txt)
        if m:
            if current_q is not None:
                ans_map[current_q] = (current_ans, clean(" ".join(expl_buf)))
                expl_buf = []
            current_q = int(m.group(1))
            current_ans = m.group(2).upper()
            collecting = False
            i += 1
            continue
        if EXPL_HDR_RE.match(txt):
            collecting = True
            i += 1
            continue
        if collecting:
            if ANS_LINE_RE.match(txt):
                continue
            if txt.strip():
                expl_buf.append(txt.strip())
        i += 1
    if current_q is not None and current_q not in ans_map:
        ans_map[current_q] = (current_ans, clean(" ".join(expl_buf)))
    return ans_map

# ---------------- Question parser ----------------
def parse_questions(lines: List[Tuple[int, str]], ans_map: Dict[int, Tuple[str, str]]) -> List[QuestionObj]:
    pages_text: Dict[int, List[str]] = {}
    for p, t in lines:
        pages_text.setdefault(p, []).append(t)
    source = extract_source_header(["\n".join(pages_text.get(0, [])), "\n".join(pages_text.get(1, []))])

    questions: List[QuestionObj] = []
    current_subject = None
    current_qnum: Optional[int] = None
    current_qtext = ""
    current_opts: List[OptionObj] = []

    def flush():
        if current_qnum is None:
            return
        qid = f"SSC-CGL-2024-Shift-1-Q{current_qnum:03d}"
        subj = current_subject or "General"
        topic, subtopic = guess_topic_from_text(subj, current_qtext)
        ans, expl = "", ""
        if current_qnum in ans_map:
            ans, expl = ans_map[current_qnum]
        questions.append(
            QuestionObj(
                id=qid,
                qnum=current_qnum,
                subject=subj,
                topic=topic,
                subtopic=subtopic,
                difficulty="medium",
                q_en=clean(current_qtext),
                q_hi="",
                q_image="",
                options=current_opts[:],
                answer=ans,
                explanation_en=expl,
                explanation_hi="",
                explanation_image="",
                assets=[],
                source=source,
                tags=["pyq","bilingual",subj.lower().replace(" ","-")]
            )
        )

    for _, txt in lines:
        sec = detect_section(txt)
        if sec:
            flush()
            current_subject, current_qnum, current_qtext, current_opts = sec, None, "", []
            continue
        m_q = QNUM_RE.match(txt)
        if m_q:
            flush()
            current_qnum = int(m_q.group(1))
            current_qtext = m_q.group(2).strip()
            current_opts = []
            continue
        if current_qnum is not None:
            m_opt = OPTION_RE.match(txt)
            if m_opt:
                raw = txt.strip()
                key = raw[0].upper()
                current_opts.append(OptionObj(key=key, en=clean(m_opt.group(1))))
                continue
            if MARKS_RE.search(txt):
                continue
            if txt and not detect_section(txt) and not QNUM_RE.match(txt):
                if not txt.upper().startswith("ANSWERS"):
                    if not OPTION_RE.match(txt):
                        current_qtext += " " + txt
    flush()
    return questions

# ---------------- JSON builder ----------------
def to_dict(q: QuestionObj) -> Dict:
    return {
        "id": q.id,
        "subject": q.subject,
        "topic": q.topic,
        "subtopic": q.subtopic,
        "difficulty": q.difficulty,
        "q": {"hi": q.q_hi, "en": q.q_en, "image": q.q_image},
        "options": [{"key": o.key, "hi": o.hi, "en": o.en, "image": o.image} for o in q.options],
        "answer": q.answer,
        "explanation": {"hi": q.explanation_hi, "en": q.explanation_en, "image": q.explanation_image},
        "assets": q.assets,
        "source": q.source,
        "tags": q.tags
    }

# ---------------- Main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    lines = read_lines(args.pdf)
    ans_map = parse_answers(lines)
    questions = parse_questions(lines, ans_map)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump([to_dict(q) for q in questions], f, ensure_ascii=False, indent=2)

    print(f"Saved {len(questions)} questions → {args.out}")

if __name__ == "__main__":
    main()
