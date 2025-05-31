/**
 * SuperJS Utility Types Examples
 * 
 * This file demonstrates built-in utility types in SuperJS.
 */

// Base type for examples
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  role: 'admin' | 'editor' | 'viewer';
  metadata: {
    lastLogin: Date;
    preferences: {
      theme: 'light' | 'dark';
      notifications: boolean;
    }
  }
}

// Partial<T>
// Makes all properties in T optional
type PartialUser = Partial<User>;

const userUpdate: PartialUser = {
  email: "new.email@example.com",
  metadata: {
    preferences: {
      theme: "dark"
    }
  }
};

// Required<T>
// Makes all properties in T required
interface OptionalUser {
  id?: number;
  name?: string;
  email?: string;
}

type RequiredUser = Required<OptionalUser>;

const completeUser: RequiredUser = {
  id: 1,
  name: "John Doe",
  email: "john@example.com"
};

// Readonly<T>
// Makes all properties in T readonly
type ReadonlyUser = Readonly<User>;

const immutableUser: ReadonlyUser = {
  id: 1,
  name: "Jane Smith",
  email: "jane@example.com",
  age: 28,
  role: "editor",
  metadata: {
    lastLogin: new Date(),
    preferences: {
      theme: "light",
      notifications: true
    }
  }
};

// immutableUser.name = "Jane Doe"; // Error: Cannot assign to 'name' because it is a read-only property

// Record<K, T>
// Constructs a type with a set of properties K of type T
type UserRoles = Record<string, string[]>;

const roles: UserRoles = {
  admin: ["manage", "create", "delete", "read"],
  editor: ["create", "update", "read"],
  viewer: ["read"]
};

// Pick<T, K>
// Picks a set of properties K from T
type UserCredentials = Pick<User, 'id' | 'email'>;

const credentials: UserCredentials = {
  id: 1,
  email: "user@example.com"
};

// Omit<T, K>
// Omits a set of properties K from T
type PublicUserInfo = Omit<User, 'id' | 'email' | 'metadata'>;

const publicInfo: PublicUserInfo = {
  name: "John Doe",
  age: 30,
  role: "admin"
};

// Exclude<T, U>
// Excludes types in U from T
type AdminOrEditor = 'admin' | 'editor' | 'viewer';
type NonAdminRoles = Exclude<AdminOrEditor, 'admin'>;

const role: NonAdminRoles = "editor"; // 'editor' | 'viewer'

// Extract<T, U>
// Extracts types in U from T
type RoleTypes = 'admin' | 'editor' | 'viewer' | 'guest' | 'owner';
type AvailableRoles = Extract<RoleTypes, 'admin' | 'editor' | 'viewer'>;

const availableRole: AvailableRoles = "admin"; // 'admin' | 'editor' | 'viewer'

// NonNullable<T>
// Removes null and undefined from T
type MaybeString = string | null | undefined;
type DefinitelyString = NonNullable<MaybeString>;

const definitelyString: DefinitelyString = "SuperJS"; // string only

// ReturnType<T>
// Obtains the return type of a function type
function createUser(name: string, email: string): User {
  return {
    id: Date.now(),
    name,
    email,
    age: 0,
    role: 'viewer',
    metadata: {
      lastLogin: new Date(),
      preferences: {
        theme: 'light',
        notifications: true
      }
    }
  };
}

type CreateUserReturn = ReturnType<typeof createUser>;

// Parameters<T>
// Obtains the parameter types of a function type as a tuple
type CreateUserParams = Parameters<typeof createUser>;

function createNewUser(...args: CreateUserParams): CreateUserReturn {
  return createUser(...args);
}

// InstanceType<T>
// Obtains the instance type of a constructor function type
class UserManager {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
  
  getUserById(id: number): User | undefined {
    return this.users.find(user => user.id === id);
  }
}

type UserManagerInstance = InstanceType<typeof UserManager>;

// Mapped types with modifiers
// Making all properties nullable
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

const nullableUser: Nullable<User> = {
  id: 1,
  name: null,
  email: "john@example.com",
  age: null,
  role: "admin",
  metadata: null
};

// Making all properties optional and readonly
type ReadonlyOptional<T> = {
  readonly [P in keyof T]?: T[P];
};

const configOptions: ReadonlyOptional<User> = {
  name: "John",
  role: "admin"
};

// Deep partial type for nested objects
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const partialUserSettings: DeepPartial<User> = {
  metadata: {
    preferences: {
      theme: "dark"
    }
  }
};

// Conditional types
type IsString<T> = T extends string ? true : false;

type IsUserString = IsString<User>; // false
type IsNameString = IsString<User['name']>; // true

// Template literal types
type UserEvent = `user:${string}`;

const validEvent: UserEvent = "user:login";
// const invalidEvent: UserEvent = "login"; // Error

// Combining utility types
type UserProfile = Readonly<Pick<User, 'id' | 'name'>> & Partial<Omit<User, 'id' | 'name'>>;

const profile: UserProfile = {
  id: 1,
  name: "John Doe",
  // All other fields are optional
  age: 30
};

// Export types for reuse
export {
  User,
  PartialUser,
  RequiredUser,
  ReadonlyUser,
  UserCredentials,
  PublicUserInfo,
  NonAdminRoles,
  AvailableRoles,
  DefinitelyString,
  CreateUserReturn,
  CreateUserParams,
  UserManagerInstance,
  Nullable,
  ReadonlyOptional,
  DeepPartial
};