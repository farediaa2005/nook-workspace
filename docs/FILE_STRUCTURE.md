src/app/
│
├── core/
│   ├── guards/
│   │   └── auth.guard.ts
│   ├── interceptors/
│   │   └── auth.interceptor.ts
│   ├── services/
│   │   └── auth.service.ts
│   └── models/
│       └── index.ts
│
├── shared/
│   └── components/
│       ├── sidebar/
│       │   ├── sidebar.component.ts
│       │   ├── sidebar.component.html
│       │   └── sidebar.component.css
│       ├── navbar/
│       │   ├── navbar.component.ts
│       │   ├── navbar.component.html
│       │   └── navbar.component.css
│       ├── footer/
│       │   ├── footer.component.ts
│       │   ├── footer.component.html
│       │   └── footer.component.css
│       ├── page-header/
│       │   ├── page-header.component.ts
│       │   ├── page-header.component.html
│       │   └── page-header.component.css
│       ├── data-table/
│       │   ├── data-table.component.ts
│       │   ├── data-table.component.html
│       │   └── data-table.component.css
│       ├── modal/
│       │   ├── modal.component.ts
│       │   ├── modal.component.html
│       │   └── modal.component.css
│       ├── confirm-dialog/
│       │   ├── confirm-dialog.component.ts
│       │   ├── confirm-dialog.component.html
│       │   └── confirm-dialog.component.css
│       ├── search-box/
│       │   ├── search-box.component.ts
│       │   ├── search-box.component.html
│       │   └── search-box.component.css
│       └── pagination/
│           ├── pagination.component.ts
│           ├── pagination.component.html
│           └── pagination.component.css
│
├── layouts/
│   ├── auth-layout/
│   │   ├── auth-layout.component.ts
│   │   ├── auth-layout.component.html
│   │   └── auth-layout.component.css
│   └── main-layout/
│       ├── main-layout.component.ts
│       ├── main-layout.component.html
│       └── main-layout.component.css
│
├── features/
│   ├── workspace/
│   │   ├── add-student/ (ts, html, css)
│   │   ├── show-student/ (ts, html, css)
│   │   └── checkout/ (ts, html, css)
│   │
│   ├── classroom/
│   │   ├── add-classroom/ (ts, html, css)
│   │   ├── show-classroom/ (ts, html, css)
│   │   └── checkout/ (ts, html, css)
│   │
│   ├── package/
│   │   ├── add-student-package/ (ts, html, css)
│   │   ├── show-student-package/ (ts, html, css)
│   │   ├── add-instructor-package/ (ts, html, css)
│   │   └── show-instructor-package/ (ts, html, css)
│   │
│   ├── shift/
│   │   ├── add-shift/ (ts, html, css)
│   │   ├── show-shift/ (ts, html, css)
│   │   └── search-shift/ (ts, html, css)
│   │
│   ├── reservation/
│   │   ├── add-reservation/ (ts, html, css)
│   │   └── show-reservation/ (ts, html, css)
│   │
│   ├── details/
│   │   ├── add-discount/ (ts, html, css)
│   │   ├── show-colleges/ (ts, html, css)
│   │   ├── show-blacklist/ (ts, html, css)
│   │   └── show-instructors/ (ts, html, css)
│   │
│   ├── catering/
│   │   ├── add-products/ (ts, html, css)
│   │   ├── show-products/ (ts, html, css)
│   │   └── product-graph/ (ts, html, css)
│   │
│   └── settings/
│       ├── add-user/ (ts, html, css)
│       └── show-user/ (ts, html, css)
│
├── auth/
│   └── login/
│       ├── login.component.ts
│       ├── login.component.html
│       └── login.component.css
│
├── app.routes.ts
├── app.config.ts
└── app.html