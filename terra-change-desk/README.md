# Terra

Earth observation **change desk**. Pair two dates, measure what moved, and decide whether it is real loss — deforestation, flood, or hardscape — or noise.

Built as a portfolio product you can run on a laptop, then put on a **Hugging Face Space** later (Docker + optional Inference API). No GPU required for v1.

## Why it looks like a product

Safety and climate teams do not want a notebook. They want a **mission view**, a **before/after slider**, a **mask**, and a **confirm/dismiss queue**. Clouds and dry seasons create false change. The review step is the product.

## How it works (read this)

Terra is **not** a chat app. Two satellite photos of the **same place**, two dates.

1. **Look** — drag the gold circle (it moves first so you see how).  
2. **Show change** — orange is a computer guess. You do not need the math.  
3. **Decide** — Yes if the ground really changed. No if it is cloud or dry season.

Cusco foothills is a cloud trick. The orange will still light up. Tap **No**.

## Demo (90 seconds)

1. Sign in `analyst@terra.dev` / `terra-demo` — you are **Syed Raza**
2. Drag the gold circle (it moves by itself first — that’s the lesson)
3. Tap **Show me the change**, then **Save this**
4. Open **Decide** and tap **Yes, it’s real** or **No, false alarm**
5. Try **Cusco foothills** — that’s a cloud trick. Tap No.

## Stack

| Layer | Choice |
| --- | --- |
| Desk | Next.js 15, Outfit + Fraunces, Tailwind |
| API | FastAPI, SQLAlchemy, SQLite |
| Detector | OpenCV abs-diff + morphology (CPU) |
| Tiles | Generated Sentinel-like pairs (in-repo) |

Optional later: set `HF_TOKEN` and swap `detect.py` for a Hub segmentation model. The dashboard does not change.

## Run locally

Python 3.10+ and Node 18+. Two terminals.

```bash
cd api
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

```bash
cd web
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| User | Password | Role |
| --- | --- | --- |
| analyst@terra.dev | terra-demo | detect + review |
| lead@terra.dev | terra-demo | same (lead) |

## Tests

```bash
cd api
pytest -q
```

## Hugging Face (later)

Ship as a **Docker Space**: API + static Next export or two processes. Keep tiles in the image. Call a satellite segmentation model through the **Inference API** so the Space stays on free CPU. Never commit `HF_TOKEN`.

## License

Personal portfolio. Demo credentials are public on purpose.
