import mongoose, {
  type HydratedDocument,
  type Model,
  Schema,
} from "mongoose";

import {
  userRoles,
  userStatuses,
  type UserRole,
  type UserStatus,
} from "./user.types.js";

export interface UserDocumentReference {
  documentId?: string;
  fileName?: string;
  publicId: string;
  url: string;
}

export interface UserEntity {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  documentUrls: UserDocumentReference[];
}

export type UserDocument = HydratedDocument<UserEntity>;

const userDocumentReferenceSchema = new Schema<UserDocumentReference>(
  {
    documentId: {
      type: String,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    publicId: {
      type: String,
      required: true,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const userSchema = new Schema<UserEntity>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: userRoles,
      default: "member",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: userStatuses,
      default: "active",
      required: true,
      index: true,
    },
    documentUrls: {
      type: [userDocumentReferenceSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ name: 1, email: 1 });

export const UserModel: Model<UserEntity> =
  mongoose.models.User ?? mongoose.model<UserEntity>("User", userSchema);
