// Basic types
interface NumberType {
  kind: 'number';
}

interface StringType {
  kind: 'string';
}

interface BooleanType {
  kind: 'boolean';
}

interface NullType {
  kind: 'null';
}

interface VoidType {
  kind: 'void';
}

interface AnyType {
  kind: 'any';
}

// Complex types
interface ArrayType {
  kind: 'array';
  elementType: Type;
}

interface ObjectType {
  kind: 'object';
  properties: Map<string, Type>;
}

interface FunctionType {
  kind: 'function';
  params: Type[];
  returnType: Type;
}

interface UnionType {
  kind: 'union';
  types: Type[];
}

interface IntersectionType {
  kind: 'intersection';
  types: Type[];
}

// Type definition
export type Type =
  | NumberType
  | StringType
  | BooleanType
  | NullType
  | VoidType
  | AnyType
  | ArrayType
  | ObjectType
  | FunctionType
  | UnionType
  | IntersectionType;

// Type environment for storing variable types
export type TypeEnvironment = Map<string, Type>;

// Compiler options types
export interface CompilerOptions {
  target: string;
  module: string;
  strict: boolean;
  declaration: boolean;
  sourceMap: boolean;
}

// Transform options
export interface TransformOptions {
  target: string;
  module: string;
  sourceMaps: boolean;
} 