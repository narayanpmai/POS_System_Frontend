# KoseliGhar Frontend - TODO & Maintenance Log

## ✅ Completed Refactorings & Fixes

- [x] **100% Redux Auth Slice**: Created `src/redux/slices/authSlice.ts` to manage user profile, active fiscal year, and super admin company selection.
- [x] **RTK Query Base Query Mutex Reauth**: Implemented `baseQueryWithReauth` in `src/redux/baseQuery.ts` using `async-mutex` matching the `Munsms-Admin` pattern.
- [x] **AppInitializer Integration**: Added `AppInitializer.tsx` in `RootLayout`, removing old `AuthProvider` context.
- [x] **Global Array Safety (`toSafeArray`)**: Protected `Navbar.tsx`, `CategorySelect.tsx`, `SearchableCustomerSelect.tsx`, `CascadingCategorySelect.tsx`, and page data views from `TypeError: S.map is not a function`.
- [x] **Custom Alert Context**: Replaced browser-native `alert()` and `confirm()` dialogs across POS, Purchases, and Expenses.

---

## 🚀 Ongoing & Future Improvements

- [ ] **Offline POS Queue**: Offline IndexedDB sync for network dropouts.
- [ ] **Thermal Printer Utility**: Optional Direct WebUSB/Bluetooth thermal printing.
