import { useRef, useState } from 'react';

const MAX = 4;

export default function ImageUpload({ images, onAdd, onRemove }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (images.length >= MAX) return;
      const reader = new FileReader();
      reader.onload = (e) => onAdd(file, e.target.result);
      reader.readAsDataURL(file);
    });
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      {images.length > 0 && (
        <div className="multi-img-grid">
          {images.map((img, i) => (
            <div key={i} className="img-thumb-wrap">
              <img src={img.preview} alt={`증거 ${i + 1}`} className="img-thumb" />
              <button className="img-remove" onClick={() => onRemove(i)} title="삭제">✕</button>
              <span className="img-num">{i + 1}</span>
            </div>
          ))}
          {images.length < MAX && (
            <div className="img-add-slot" onClick={() => inputRef.current?.click()}>
              <span>+</span>
              <span style={{ fontSize: '.72rem' }}>사진 추가</span>
            </div>
          )}
        </div>
      )}

      {images.length === 0 && (
        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="dropzone-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="dropzone-text">클릭하거나 사진을 여기에 드래그</p>
          <p className="dropzone-hint">최대 {MAX}장 · 모바일에서 탭 시 카메라 촬영 가능<br />최대 10MB · JPG, PNG, WEBP</p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {images.length > 0 && (
        <p className="img-count-note">{images.length}/{MAX}장 첨부됨 {images.length < MAX && `· 최대 ${MAX - images.length}장 더 추가 가능`}</p>
      )}
    </div>
  );
}
