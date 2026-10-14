"""서버 임베딩 (docs/06 §5). ONNX Runtime CPU, L2 정규화된 벡터 반환.

모델 파일이 없으면 None 을 돌려주고 /recognize 는 501 로 응답한다 (피처 플래그 역할).
전처리: RGB → 224 리사이즈 → ImageNet 정규화 → NCHW float32.
"""

from __future__ import annotations

import io
from functools import lru_cache

from app.config import get_settings


class OnnxEmbedder:
    def __init__(self, path: str, size: int = 224, threads: int = 4) -> None:
        import numpy as np
        import onnxruntime as ort

        self.np = np
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = threads
        self.sess = ort.InferenceSession(path, opts, providers=["CPUExecutionProvider"])
        self.input_name = self.sess.get_inputs()[0].name
        self.size = size
        self.mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.std = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def preprocess(self, img):
        from PIL import ImageOps

        img = ImageOps.exif_transpose(img).convert("RGB")
        img = ImageOps.fit(img, (self.size, self.size))
        x = self.np.asarray(img, dtype=self.np.float32) / 255.0
        x = (x - self.mean) / self.std
        return x.transpose(2, 0, 1)[None]

    def embed_bytes(self, data: bytes) -> list[float]:
        from PIL import Image

        x = self.preprocess(Image.open(io.BytesIO(data)))
        v = self.sess.run(None, {self.input_name: x})[0][0].astype(self.np.float32)
        v = v / (self.np.linalg.norm(v) + 1e-8)
        return v.tolist()


@lru_cache
def get_embedder() -> OnnxEmbedder | None:
    path = get_settings().embedder_onnx_path
    if not path:
        return None
    return OnnxEmbedder(path)
