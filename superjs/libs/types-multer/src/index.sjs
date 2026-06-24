// @superjs/types-multer — hand-curated SJS bindings for Multer 1.x core surface.

export type File {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: dynamic;
}

export type Multer {
  single(fieldName: string): dynamic;
  array(fieldName: string, maxCount: number): dynamic;
  fields(fields: dynamic): dynamic;
  none(): dynamic;
  any(): dynamic;
}

export type StorageEngine {
  _handleFile(req: dynamic, file: dynamic, cb: dynamic): void;
  _removeFile(req: dynamic, file: dynamic, cb: dynamic): void;
}

export type MulterOptions {
  storage: StorageEngine | dynamic;
  limits: dynamic;
  fileFilter: dynamic;
}

export type MulterFactory = (opts: MulterOptions) => Multer;
