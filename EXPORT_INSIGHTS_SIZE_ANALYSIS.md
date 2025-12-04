# Export Insights Route Size Analysis

## Source File Metrics

- **File**: `src/app/api/admin/export-insights/route.ts`
- **Source Size**: 50.67 KB (51,891 bytes)
- **Lines of Code**: 1,205 lines
- **Prisma Queries**: ~60 database queries

## Bundle Size Impact

### ✅ Minimal Bundle Contribution (~15-25 KB)

**Why it's small:**
1. **ExcelJS is dynamically imported** - Not bundled, loaded on-demand
   ```typescript
   const ExcelJS = (await import('exceljs')).default
   ```
   - ExcelJS (~5MB) is NOT included in the bundle
   - Only loaded when the route is accessed

2. **Prisma is externalized** - Not bundled
   - Prisma client is externalized in `netlify.toml`
   - Loaded from `node_modules` at runtime

3. **Only route code is bundled**
   - Compiled/minified JavaScript: ~15-25 KB
   - After Next.js optimization and tree-shaking

### Estimated Bundle Size Breakdown

| Component | Size | Status |
|-----------|------|--------|
| Route source code | 50.67 KB | ✅ |
| Compiled/minified | ~15-25 KB | ✅ Bundled |
| ExcelJS library | ~5 MB | ❌ Not bundled (dynamic import) |
| Prisma client | ~40-50 MB | ❌ Not bundled (externalized) |

**Total Bundle Contribution: ~15-25 KB** ✅

## Runtime Memory Usage

### ⚠️ High Runtime Memory Consumption

**During Execution:**
1. **Database Queries**: ~60 Prisma queries fetching large datasets
   - All voters
   - All votes
   - All candidates
   - All zones
   - Multiple aggregations

2. **In-Memory Processing**:
   - Large arrays of data in memory
   - Excel workbook creation
   - Multiple worksheet operations
   - Styling and formatting

3. **Excel Buffer Generation**:
   - Final Excel file created in memory
   - Can be 10-100+ MB depending on data size
   - Logged: `Buffer size: ${(buffer.byteLength / 1024 / 1024).toFixed(2)} MB`

### Estimated Runtime Memory

| Operation | Memory Usage |
|-----------|--------------|
| Database queries | 50-200 MB (depends on data) |
| In-memory processing | 100-500 MB |
| Excel buffer | 10-100+ MB |
| **Total Peak** | **~200-800 MB** |

## Performance Considerations

### ⚠️ Potential Issues

1. **Netlify Timeout**: 10-second default limit
   - Route may timeout with large datasets
   - Consider Netlify Background Functions

2. **Memory Limits**: 
   - Netlify functions have memory limits
   - Large datasets may cause OOM errors

3. **Cold Start Impact**:
   - ExcelJS dynamic import adds ~100-200ms
   - Acceptable trade-off for bundle size

## Optimization Recommendations

### ✅ Already Optimized

1. ✅ ExcelJS dynamically imported
2. ✅ Prisma externalized
3. ✅ Route code is minimal

### 🔧 Further Optimizations (if needed)

1. **Split into smaller routes**:
   - Separate route for each sheet type
   - Reduces memory per request

2. **Use streaming**:
   - Stream Excel generation instead of buffering
   - Reduces peak memory usage

3. **Pagination**:
   - Process data in batches
   - Reduces memory footprint

4. **Background Functions**:
   - Move to Netlify Background Functions
   - Longer timeout (15 minutes)
   - Better for large exports

5. **Caching**:
   - Cache results for frequently accessed exports
   - Reduce database load

## Summary

### Bundle Size: ✅ Excellent (~15-25 KB)
- Minimal impact on deployment bundle
- ExcelJS and Prisma not bundled
- Only route code included

### Runtime Memory: ⚠️ High (~200-800 MB)
- Large memory usage during execution
- Depends on dataset size
- May need optimization for very large datasets

### Recommendation
- **Bundle size**: No changes needed ✅
- **Runtime**: Monitor for large datasets, consider Background Functions if timeout issues occur

---

**Conclusion**: The export-insights route contributes **~15-25 KB** to the bundle size, which is excellent. However, it uses significant runtime memory (200-800 MB) during execution, which is expected for large data exports.

