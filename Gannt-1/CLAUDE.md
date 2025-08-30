# Claude Code Project Memory

## Project Overview
マンション修繕計画ガントチャートアプリ - Frappe Ganttを使用したWebベースの修繕工事管理システム

## Current Status (2025-08-29)
- **Current Phase**: Phase-1A-3 完全完了 ✅ (大学提出版完成)
- **Last Commit**: "feat: 会議ダイヤモンドカラー修正・デバッグログクリーンアップ完了"
- **Branch**: main

## Key Completed Features
1. **MVP全段階完了**: Excel/CSV読み込み、ガントチャート表示、出力機能
2. **Phase-1A-1完了**: 表示モード切替（日/週/月/年）
3. **Phase-1A-2完了**: 会議イベント同一線上表示（◆マーク）+ 統一ポップアップシステム
4. **Phase-1A-3完了**: 会議イベントカラーシステム修正 + 依存関係矢印表示

## Technical Architecture
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Gantt Library**: Frappe Gantt v0.6.1 (stable)
- **File Processing**: SheetJS
- **Development Environment**: GitHub Codespaces

## Important Technical Solutions
- **Diamond Mark Rendering**: Custom SVG elements for meeting events
- **Popup System**: Unified UX for both construction and meeting events
- **Frappe Gantt Customization**: Override built-in tooltips with custom modals
- **Meeting Color System**: Organization-level based dynamic color assignment
- **Dependency Arrow Display**: Custom SVG arrow rendering for task dependencies

## File Structure
```
├── index.html
├── css/
│   ├── style.css (main styles)
│   └── gantt.css (gantt-specific styles, popup modals)
├── js/
│   ├── main.js (main control, initialization)
│   ├── data-processor.js (file processing)
│   ├── gantt-manager.js (gantt management, custom rendering)
│   └── error-handler.js (error handling)
└── README.md (comprehensive documentation)
```

## Next Priority Tasks (Phase-1A-3)

### 1. Unified Excel Format Implementation (New Priority)
- **Goal**: Single xlsx file for both construction and meeting events
- **Architecture**: Internal dual-CSV separation approach
  - Input: Unified 19-column xlsx format
  - Processing: Auto-detection of event_type → separate into construction/meeting datasets
  - Frappe Integration: Standard 6-column CSV for construction events
  - Custom Rendering: Meeting data handled by custom diamond display system
- **User Experience**: Single file input/output, seamless workflow
- **Status**: Design completed, implementation pending

### 2. Dependency Arrow Display
- **Issue**: Frappe Gantt v0.6.1 → v1.0.3 upgrade needed
- **Goal**: Display arrows from predecessor end → successor start
- **Status**: Version upgrade branch exists, needs resolution
- **Alternative**: Custom arrow rendering to override Frappe triangle fill

### 3. Immediate Actions for Next Session
1. Implement unified xlsx format processing
2. Test Frappe Gantt v1.0.3 upgrade compatibility
3. Implement dependency arrow display
4. Fix any breaking changes from version upgrade

## Development Commands
```bash
# Start development server
python3 -m http.server 8080

# Test application
# Open http://localhost:8080

# Run linting (if needed)
# npm run lint
```

## Current Working Features ✅
- Excel/CSV file import (drag & drop)
- Meeting events display as diamond marks (◆)
- Meeting hierarchy: General Meeting → Board Meeting → Repair Committee
- Construction events display as bars
- Unified popup system with memo editing
- View mode switching (Day/Week/Month/Year)
- Excel export functionality

## Known Issues/Limitations
- Dependency arrows: limited by Frappe Gantt v0.6.1 (needs upgrade)
- Edit functionality: not yet implemented (Phase-1B)

## Testing Checklist for Next Session
- [ ] Load sample data successfully
- [ ] Diamond marks display correctly for meetings
- [ ] Construction bars display correctly
- [ ] Popup modals work for both event types
- [ ] Memo editing and saving functions
- [ ] View mode switching works
- [ ] No console errors

## Important Notes
- Always test on http://localhost:8080 before making changes
- Meeting events use aggregation approach to overcome "1 task = 1 row" limitation
- Custom SVG rendering overlays Frappe Gantt for diamond marks
- All popup styling in css/gantt.css with unified selectors

## Technical Architecture Decisions (2025-08-22)

### Unified Excel Format Strategy
**Problem**: Currently separate xlsx formats for construction (7 columns) and meeting events (17 columns)
**Solution**: Unified 19-column xlsx format with internal separation

**Data Flow Architecture**:
```
User Input (xlsx) → Internal Processing → Dual Output
     ↓                      ↓                ↓
Unified 19-col        event_type        Construction CSV (→ Frappe Gantt)
Format              detection logic     Meeting CSV (→ Custom Diamond Display)
```

**Column Schema (19 columns)**:
```
id, name, start, end, progress, dependencies, assignee, event_type,
organization_level, organization_type, decision_authority, report_to,
attendees, location, agenda, timeline_color, priority, frequency, memo
```

**Processing Logic**:
- `event_type` column determines routing: 'construction' → Frappe, 'meeting' → Custom
- Construction events: Extract standard 6 columns (id, name, start, end, progress, dependencies)
- Meeting events: Full data preserved for custom diamond rendering and popup details
- Backward compatibility: Existing separate files still supported

**Benefits**:
- Single file management for users
- Cross-event dependencies possible
- Maintains Frappe Gantt compatibility
- Preserves all meeting metadata for rich UX

## Technical Implementation Record (Phase-1A-3) - 2025-08-29

### Meeting Diamond Color System Fix
**Problem**: CSV `timeline_color` values overriding organization-based color system
- 総会: Fixed color #8B0000 instead of requested #ff99ff
- 理事会: Fixed color #FF8C00 instead of requested #99ccff
- 委員会: Fixed color #32CD32 instead of requested #99ff99

**Root Cause**: `meetingTask.hierarchy_info.color` using CSV timeline_color directly

**Solution**: Modified `createDiamondSVG` function to use `getMeetingColors()` instead
```javascript
// Old: Used CSV timeline_color directly
diamond.setAttribute('fill', meetingTask.hierarchy_info.color);

// New: Use organization-level based colors
const colors = this.getMeetingColors(meetingTask, meeting);
diamond.setAttribute('fill', colors.fill);
diamond.setAttribute('stroke', colors.stroke);
```

**Result**: Dynamic color assignment based on organization hierarchy
- 総会 (Level 1): #ff99ff (pink) ✅
- 理事会 (Level 2): #99ccff (blue) ✅  
- 委員会 (Level 3): #99ff99 (green) ✅

### Code Cleanup
- Removed debug console.log statements from production code
- Cleaned up Phase-1 development logging
- Maintained essential error handling logs only

### Final Status
- **Production Ready**: Clean code without debug output
- **Color System**: Organization-level based dynamic colors working
- **Dependency Arrows**: Working with custom SVG rendering
- **All Features**: MVP + Phase-1A-1 + Phase-1A-2 + Phase-1A-3 complete

## Next Development Phase (Phase-2: Backend Integration)

### Phase-2 Overview: Supabase Integration for Multi-User Support
**Goal**: Transform standalone web app into collaborative multi-user system
**Architecture**: Keep current Vanilla JS + Frappe Gantt, add Supabase backend
**Timeline**: Post university submission (Phase-1 completion)

### Phase-2A: Database Integration (Priority 1)
**Scope**: Replace local file I/O with cloud database operations

**Technical Implementation**:
```javascript
// Add to existing DataProcessor.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Database schema
projects: {
  id: uuid (primary key)
  name: text
  data: jsonb (19-column unified format)
  created_by: uuid (user reference)
  created_at: timestamp
  updated_at: timestamp
}
```

**Features**:
- ✅ **Cloud Data Storage**: Replace Excel I/O with Supabase database
- ✅ **Auto-save**: Real-time data synchronization
- ✅ **Version History**: Track project changes over time
- ✅ **Data Validation**: Server-side data integrity checks

### Phase-2B: User Authentication (Priority 2)
**Scope**: Add user accounts and session management

**Technical Implementation**:
```javascript
// Authentication integration
async function signUp(email, password) {
    const { user, error } = await supabase.auth.signUp({
        email: email,
        password: password
    })
}

async function signIn(email, password) {
    const { user, error } = await supabase.auth.signIn({
        email: email,
        password: password
    })
}
```

**Features**:
- ✅ **Email/Password Auth**: Standard authentication system
- ✅ **Session Management**: Persistent login state
- ✅ **User Profiles**: Basic user information storage
- ✅ **Password Recovery**: Email-based password reset

### Phase-2C: Multi-User Collaboration (Priority 3)
**Scope**: Enable project sharing and collaborative editing

**Technical Implementation**:
```javascript
// Project sharing schema
project_members: {
  project_id: uuid (foreign key)
  user_id: uuid (foreign key)
  role: enum ('owner', 'editor', 'viewer')
  joined_at: timestamp
}

// Real-time collaboration
const channel = supabase.channel('project-changes')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'projects' },
        (payload) => refreshGanttChart(payload.new)
    )
```

**Features**:
- ✅ **Project Ownership**: Owner/Editor/Viewer role system
- ✅ **Share Links**: Invite users to projects
- ✅ **Real-time Updates**: Live collaboration on Gantt charts
- ✅ **Conflict Resolution**: Handle concurrent editing

### Phase-2 Technical Benefits
**Minimal Architecture Change**:
- Keep existing HTML/CSS/JS structure
- Keep Frappe Gantt integration
- Keep 19-column unified format
- Add Supabase SDK as single dependency

**Development Efficiency**:
- Reuse 100% of current UI/UX logic
- Reuse data processing pipelines
- Reuse custom SVG rendering system
- Add backend features incrementally

### Phase-2 Implementation Timeline
1. **Week 1-2**: Database schema design + basic CRUD operations
2. **Week 3-4**: User authentication integration
3. **Week 5-6**: Multi-user project sharing
4. **Week 7-8**: Real-time collaboration features
5. **Week 9-10**: Testing, optimization, deployment

### Phase-2 Success Criteria
- [ ] Multiple users can access same project simultaneously
- [ ] Data persists in cloud database (no local Excel files)
- [ ] User authentication works reliably
- [ ] Project sharing via email invitations
- [ ] Real-time updates when users modify charts
- [ ] Backward compatibility with Phase-1 functionality

### Database Schema Design
```sql
-- Users (handled by Supabase Auth)
-- Built-in user management

-- Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    data JSONB NOT NULL, -- 19-column unified format
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Project members table
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    role TEXT CHECK (role IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
```