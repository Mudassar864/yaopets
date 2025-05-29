import express from "express";
import path from "path";
import { Express } from "express";

export function configureStaticFiles(app: Express) {
  // Servir arquivos estáticos da pasta uploads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
  
  // Servir SVGs e outros arquivos da pasta public
  app.use(express.static(path.join(process.cwd(), "public")));
}