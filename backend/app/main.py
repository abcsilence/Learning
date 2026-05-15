from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.prices import router as prices_router


app = FastAPI(title="PriceTracker API")
@app.get("/")
async def root() -> dict:
    return {"message": "Welcome to the PriceTracker API"}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(prices_router, prefix="/api")


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
