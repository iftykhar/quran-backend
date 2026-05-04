# Quran Web Application Backend

The backend API for the Quran Web Application, built with **Node.js**, **Hono**, and **SQLite**.

## 🚀 Live API
- **Live Link**: [https://quran-backend-dscw.onrender.com/](https://quran-backend-dscw.onrender.com/)

---

## 🛠 Tech Stack
- **Framework**: Hono
- **Runtime**: Node.js
- **Language**: TypeScript
- **Database**: SQLite
- **Documentation**: Custom REST API endpoints

---

## ✨ Features
- **Fast Lookups**: Optimized SQLite indexing for Ayahs, Surahs, and Pages.
- **Madani Mushaf Support**: Accurate page-to-ayah mapping for all 604 pages.
- **Search Engine**: Arabic and English text search across the entire Quran.
- **Clean Architecture**: Controller-Service pattern for maintainability.

---

## 📦 Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Seed Database:
   Ensure `quran.db` is present in the root directory.

3. Start the dev server:
   ```bash
   npm run dev
   ```
