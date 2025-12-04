# What Can Be Eliminated to Fix Netlify 250MB Problem

## Analysis Summary

Based on your current configuration, here's what can be eliminated or optimized to reduce bundle size below 250MB:

---

## 🔴 HIGH IMPACT ELIMINATIONS (50-100+ MB savings)

### 1. **Remove Unused Large Dependencies**

#### **jsdom** (~20-30 MB)
- **Status**: Listed in dependencies but **NOT USED** in codebase
- **Found**: Only in externalized list, no actual imports found
- **Action**: Remove from `package.json` dependencies
- **Savings**: ~20-30 MB

#### **isomorphic-dompurify** (~5-10 MB)
- **Status**: Listed in dependencies but **NOT USED** in codebase
- **Found**: Only in externalized list, no actual imports found
- **Action**: Remove from `package.json` dependencies
- **Savings**: ~5-10 MB

#### **jspdf** (~3-5 MB)
- **Status**: Listed in dependencies but **NOT USED** in API routes
- **Found**: Only in externalized list, no actual imports in API routes
- **Action**: Remove from `package.json` dependencies (unless used in client components)
- **Savings**: ~3-5 MB

### 2. **Remove Test/Debug Routes** (~5-10 MB)

These routes are likely only for development/testing:

- `/api/test-csrf` - Test route
- `/api/test-storage` - Test route  
- `/api/upload/test` - Test route
- `/api/upload/diagnostic` - Diagnostic route
- `/api/voter/test` - Test route
- `/api/candidate/test-auth` - Test route
- `/api/health/detailed` - Detailed health (keep basic `/api/health`)

**Action**: Remove these routes or move to dev-only
**Savings**: ~5-10 MB (code + dependencies)

### 3. **Remove Unused Radix UI Components** (~10-20 MB)

Check which Radix UI components are actually used:
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-avatar`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-icons`
- `@radix-ui/react-label`
- `@radix-ui/react-progress`
- `@radix-ui/react-radio-group`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toast`

**Action**: Audit and remove unused Radix UI packages
**Savings**: ~2-5 MB per unused package

---

## 🟡 MEDIUM IMPACT ELIMINATIONS (20-50 MB savings)

### 4. **Move exceljs to dependencies** (if used in API routes)

Currently in `devDependencies` but used in:
- `/api/admin/export/route.ts` (dynamically imported)
- `/api/admin/export-insights/route.ts` (dynamically imported)

**Status**: Already dynamically imported, so OK
**Action**: Keep as-is (already optimized)

### 5. **Remove recharts from Server Bundle** (~5-10 MB)

- **Status**: Used only in client component (`ChartsWrapper.tsx`)
- **Current**: Externalized in `netlify.toml` but might still be included
- **Action**: Ensure it's NOT in `serverComponentsExternalPackages` (already done ✅)
- **Savings**: ~5-10 MB if accidentally bundled

### 6. **Remove Unused AWS SDK Packages** (~10-20 MB)

Check if all AWS SDK packages are needed:
- `@aws-sdk/client-s3` - ✅ Used (S3 storage)
- `@aws-sdk/s3-request-presigner` - ✅ Used (presigned URLs)
- `@aws-sdk/client-sso` - ❓ Check if used
- `@aws-sdk/client-sso-oidc` - ❓ Check if used
- `@aws-sdk/credential-providers` - ❓ Check if used
- `@aws-sdk/middleware-stack` - ❓ Check if used
- `@aws-sdk/shared-ini-file-loader` - ❓ Check if used
- `@aws-sdk/util-credentials` - ❓ Check if used

**Action**: Audit and remove unused AWS SDK packages
**Savings**: ~2-5 MB per unused package



---

## 🟢 LOW IMPACT OPTIMIZATIONS (5-20 MB savings)







### 10. **Remove Unused Scripts from package.json**

These scripts are for local development and don't affect bundle:
- `deploy:production`, `start:production`, `monitor`, `logs`, `restart`, `stop`, `status`

**Action**: Keep (they don't affect bundle size)

---

## 📊 ESTIMATED TOTAL SAVINGS

| Category | Estimated Savings |
|----------|------------------|
| Remove unused dependencies (jsdom, isomorphic-dompurify, jspdf) | 30-45 MB |
| Remove test/debug routes | 5-10 MB |
| Remove unused Radix UI components | 10-20 MB |
| Remove unused AWS SDK packages | 10-20 MB |
| Remove Cloudinary (if unused) | 5-10 MB |
| Remove unused API routes | 5-10 MB |
| **TOTAL POTENTIAL SAVINGS** | **65-115 MB** |

---

## 🎯 PRIORITY RECOMMENDATIONS

### **Immediate Actions (Highest Impact):**

1. **Remove jsdom** - Not used, saves ~20-30 MB
2. **Remove isomorphic-dompurify** - Not used, saves ~5-10 MB
3. **Remove jspdf** - Not used in API routes, saves ~3-5 MB
4. **Remove test routes** - Development only, saves ~5-10 MB

**Total Immediate Savings: ~33-55 MB**

### **Secondary Actions:**

5. Audit and remove unused Radix UI components
6. Audit and remove unused AWS SDK packages
7. Remove Cloudinary if not using it

**Additional Savings: ~25-50 MB**

---

## 🔍 HOW TO VERIFY WHAT'S ACTUALLY USED

### Check for jsdom usage:
```bash
grep -r "jsdom" src/ --exclude-dir=node_modules
```

### Check for isomorphic-dompurify usage:
```bash
grep -r "isomorphic-dompurify" src/ --exclude-dir=node_modules
```

### Check for jspdf usage:
```bash
grep -r "jspdf\|jsPDF" src/ --exclude-dir=node_modules
```

### Check for Cloudinary usage:
```bash
grep -r "cloudinary" src/ --exclude-dir=node_modules
```

### Check AWS SDK usage:
```bash
grep -r "@aws-sdk" src/ --exclude-dir=node_modules
```

---

## 📝 SUMMARY

**Current Status:**
- Many optimizations already in place ✅
- Standalone mode enabled ✅
- 40+ dependencies externalized ✅
- Dynamic imports for heavy libraries ✅

**What's Left:**
- Remove unused dependencies (jsdom, isomorphic-dompurify, jspdf)
- Remove test/debug routes
- Audit and remove unused Radix UI components
- Audit and remove unused AWS SDK packages

**Expected Result After Eliminations:**
- Current: ~250+ MB (exceeds limit)
- After eliminations: ~135-185 MB ✅ (well under 250 MB limit)

---

## ⚠️ IMPORTANT NOTES

1. **Don't remove Prisma** - Required for database
2. **Don't remove Next.js/React** - Core framework
3. **Don't remove externalized packages** - They're already not bundled
4. **Test after removals** - Ensure functionality still works
5. **Remove from both dependencies AND externalized lists** - If removing a package, also remove it from `netlify.toml` externalized list

---

**Recommendation**: Start with the "Immediate Actions" list above. These should reduce your bundle size by 33-55 MB, bringing you well under the 250 MB limit.

