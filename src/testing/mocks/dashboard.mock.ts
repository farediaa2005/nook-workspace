export interface UpcomingRoomBooking {
  id: string;
  roomName: string;
  roomNameAr: string;
  title: string;
  titleAr: string;
  instructor: string;
  instructorAr: string;
  timeSlot: string;
  attendees: number;
  status: 'in_progress' | 'upcoming' | 'confirmed';
}

export interface ActiveStudentPreviewItem {
  id: string;
  name: string;
  spaceOrFaculty: string;
  checkInTime: string;
  duration: string;
}

export interface ActivityFlowPoint {
  label: string;
  labelAr: string;
  count: number;
  occupancy: number;
  x: number;
  y: number;
}

export const MOCK_HOURLY_ACTIVITY_POINTS: ActivityFlowPoint[] = [
  { label: '09 AM', labelAr: '09 ص', count: 12, occupancy: 28, x: 25, y: 135 },
  { label: '11 AM', labelAr: '11 ص', count: 24, occupancy: 52, x: 100, y: 95 },
  { label: '01 PM', labelAr: '01 م', count: 36, occupancy: 78, x: 180, y: 55 },
  { label: '03 PM', labelAr: '03 م', count: 44, occupancy: 94, x: 260, y: 25 },
  { label: '05 PM', labelAr: '05 م', count: 39, occupancy: 85, x: 340, y: 42 },
  { label: '07 PM', labelAr: '07 م', count: 31, occupancy: 68, x: 420, y: 75 },
  { label: '09 PM', labelAr: '09 م', count: 18, occupancy: 40, x: 495, y: 118 }
];

export const MOCK_WEEKLY_ACTIVITY_POINTS: ActivityFlowPoint[] = [
  { label: 'Sat', labelAr: 'السبت', count: 26, occupancy: 55, x: 25, y: 105 },
  { label: 'Sun', labelAr: 'الأحد', count: 38, occupancy: 82, x: 100, y: 52 },
  { label: 'Mon', labelAr: 'الإثنين', count: 30, occupancy: 65, x: 180, y: 80 },
  { label: 'Tue', labelAr: 'الثلاثاء', count: 45, occupancy: 96, x: 260, y: 22 },
  { label: 'Wed', labelAr: 'الأربعاء', count: 35, occupancy: 76, x: 340, y: 62 },
  { label: 'Thu', labelAr: 'الخميس', count: 41, occupancy: 88, x: 420, y: 38 },
  { label: 'Fri', labelAr: 'الجمعة', count: 22, occupancy: 46, x: 495, y: 122 }
];

export const MOCK_DEFAULT_UPCOMING_RESERVATIONS: UpcomingRoomBooking[] = [
  {
    id: 'RES-101',
    roomName: 'Hall A (Main Classroom)',
    roomNameAr: 'قاعة أ (القاعة الرئيسية)',
    title: 'Fullstack Web Dev Workshop',
    titleAr: 'ورشة تطوير الويب الشامل',
    instructor: 'Eng. Ahmed Tarek',
    instructorAr: 'م. أحمد طارق',
    timeSlot: '02:00 PM - 05:00 PM',
    attendees: 28,
    status: 'in_progress'
  },
  {
    id: 'RES-102',
    roomName: 'Meeting Room 1',
    roomNameAr: 'غرفة اجتماعات 1',
    title: 'Graduation Project Discussion',
    titleAr: 'مناقشة مشروع التخرج',
    instructor: 'Dr. Sarah Mansour',
    instructorAr: 'د. سارة منصور',
    timeSlot: '05:30 PM - 07:30 PM',
    attendees: 8,
    status: 'upcoming'
  },
  {
    id: 'RES-103',
    roomName: 'Meeting Room 2',
    roomNameAr: 'غرفة اجتماعات 2',
    title: 'UI/UX Design Sprint',
    titleAr: 'جلسة تصميم واجهات وتجربة مستخدم',
    instructor: 'Nour El-Din',
    instructorAr: 'نور الدين',
    timeSlot: '08:00 PM - 10:00 PM',
    attendees: 6,
    status: 'confirmed'
  }
];

export const MOCK_DEFAULT_STUDENTS_PREVIEW: ActiveStudentPreviewItem[] = [
  { id: '1', name: 'Omar Khaled', spaceOrFaculty: 'Computer Engineering', checkInTime: '01:15 PM', duration: '2h 15m' },
  { id: '2', name: 'Mariam Said', spaceOrFaculty: 'Faculty of Medicine', checkInTime: '01:45 PM', duration: '1h 45m' },
  { id: '3', name: 'Youssef Ali', spaceOrFaculty: 'Applied Arts', checkInTime: '02:10 PM', duration: '1h 20m' },
  { id: '4', name: 'Salma Tarek', spaceOrFaculty: 'Business Administration', checkInTime: '02:30 PM', duration: '1h 00m' }
];

export const NAME_ARABIC_DICTIONARY: Record<string, string> = {
  'mariem': 'مريم', 'mariam': 'مريم', 'maryam': 'مريم', 'meriam': 'مريم', 'meryem': 'مريم',
  'mohamed': 'محمد', 'mohammad': 'محمد', 'muhammad': 'محمد', 'mohammed': 'محمد', 'mhamed': 'محمد',
  'ahmed': 'أحمد', 'ahmad': 'أحمد',
  'mahmoud': 'محمود', 'mahmud': 'محمود',
  'omar': 'عمر', 'omer': 'عمر',
  'khaled': 'خالد', 'khalid': 'خالد',
  'youssef': 'يوسف', 'yousef': 'يوسف', 'yusuf': 'يوسف',
  'ali': 'علي', 'aly': 'علي',
  'salma': 'سلمى', 'selma': 'سلمى',
  'tarek': 'طارق', 'tarik': 'طارق',
  'sarah': 'سارة', 'sara': 'سارة',
  'nour': 'نور', 'noor': 'نور',
  'hassan': 'حسن', 'hasan': 'حسن',
  'hussein': 'حسين', 'hussien': 'حسين',
  'mostafa': 'مصطفى', 'mustafa': 'مصطفى', 'moustafa': 'مصطفى',
  'karim': 'كريم', 'kareem': 'كريم',
  'ibrahim': 'إبراهيم', 'ebrahim': 'إبراهيم',
  'fatma': 'فاطمة', 'fatima': 'فاطمة', 'fatimah': 'فاطمة',
  'aya': 'آية', 'ayah': 'آية',
  'nada': 'ندى',
  'reem': 'ريم', 'rim': 'ريم',
  'mona': 'منى',
  'hossam': 'حسام', 'hosam': 'حسام',
  'amr': 'عمرو',
  'ziad': 'زياد', 'zeyad': 'زياد',
  'menna': 'منة', 'mennatallah': 'منة الله',
  'habiba': 'حبيبة', 'malak': 'ملك', 'shahd': 'شهد', 'jana': 'جنى',
  'farah': 'فرح', 'yara': 'يارا', 'rawan': 'روان', 'nouran': 'نوران',
  'dina': 'دينا', 'yasmin': 'ياسمين', 'yasmine': 'ياسمين',
  'alaa': 'علاء', 'samir': 'سمير', 'sameer': 'سمير',
  'sayed': 'سيد', 'said': 'سعيد', 'saeed': 'سعيد',
  'ashraf': 'أشرف', 'gamal': 'جمال', 'jamal': 'جمال',
  'adel': 'عادل', 'magdy': 'مجدي', 'magdi': 'مجدي',
  'wael': 'وائل', 'hany': 'هاني', 'hani': 'هاني',
  'sherif': 'شريف', 'shereef': 'شريف', 'ramy': 'رامي', 'rami': 'رامي',
  'mina': 'مينا', 'peter': 'بيتر', 'george': 'جورج', 'fady': 'فادي',
  'kamal': 'كمال', 'nasser': 'ناصر',
  'abdelrahman': 'عبد الرحمن', 'abdulrahman': 'عبد الرحمن',
  'abdullah': 'عبد الله', 'abdallah': 'عبد الله',
  'abdelaziz': 'عبد العزيز', 'abdulaziz': 'عبد العزيز',
  'osama': 'أسامة', 'eslam': 'إسلام', 'islam': 'إسلام',
  'eman': 'إيمان', 'asmaa': 'أسماء', 'asma': 'أسماء',
  'salwa': 'سلوى', 'marwa': 'مروة', 'rania': 'رانيا',
  'eng.': 'م.', 'dr.': 'د.'
};

export const NAME_ENGLISH_DICTIONARY: Record<string, string> = {
  'مريم': 'Mariam', 'محمد': 'Mohamed', 'أحمد': 'Ahmed', 'احمد': 'Ahmed',
  'محمود': 'Mahmoud', 'عمر': 'Omar', 'خالد': 'Khaled', 'يوسف': 'Youssef',
  'علي': 'Ali', 'سلمى': 'Salma', 'طارق': 'Tarek', 'سارة': 'Sarah', 'ساره': 'Sarah',
  'نور': 'Nour', 'حسن': 'Hassan', 'حسين': 'Hussein',
  'مصطفى': 'Mostafa', 'كريم': 'Karim', 'إبراهيم': 'Ibrahim', 'ابراهيم': 'Ibrahim',
  'فاطمة': 'Fatma', 'فاطمه': 'Fatma', 'آية': 'Aya', 'اية': 'Aya',
  'ندى': 'Nada', 'ريم': 'Reem', 'منى': 'Mona', 'حسام': 'Hossam',
  'عمرو': 'Amr', 'زياد': 'Ziad', 'منة': 'Menna', 'منه': 'Menna',
  'حبيبة': 'Habiba', 'ملك': 'Malak', 'شهد': 'Shahd', 'جنى': 'Jana',
  'فرح': 'Farah', 'يارا': 'Yara', 'روان': 'Rawan', 'نوران': 'Nouran',
  'دينا': 'Dina', 'ياسمين': 'Yasmine', 'علاء': 'Alaa', 'سمير': 'Samir',
  'سيد': 'Sayed', 'سعيد': 'Said', 'أشرف': 'Ashraf', 'اشرف': 'Ashraf',
  'جمال': 'Gamal', 'عادل': 'Adel', 'مجدي': 'Magdy', 'وائل': 'Wael',
  'هاني': 'Hany', 'شريف': 'Sherif', 'رامي': 'Ramy', 'مينا': 'Mina',
  'عبد الرحمن': 'Abdelrahman', 'عبد الله': 'Abdullah', 'عبد العزيز': 'Abdelaziz',
  'أسامة': 'Osama', 'اسامة': 'Osama', 'إسلام': 'Islam', 'اسلام': 'Islam',
  'إيمان': 'Eman', 'ايمان': 'Eman', 'أسماء': 'Asmaa', 'اسماء': 'Asmaa',
  'سلوى': 'Salwa', 'مروة': 'Marwa', 'رانيا': 'Rania',
  'م.': 'Eng.', 'د.': 'Dr.'
};

export function formatStudentName(name: string, isAr: boolean): string {
  if (!name) return '';
  const trimmed = name.trim();

  if (isAr) {
    const lower = trimmed.toLowerCase();
    if (NAME_ARABIC_DICTIONARY[lower]) return NAME_ARABIC_DICTIONARY[lower];

    const words = trimmed.split(/\s+/);
    return words.map(w => {
      const clean = w.toLowerCase().replace(/[^\w\u0600-\u06FF]/g, '');
      if (NAME_ARABIC_DICTIONARY[clean]) {
        return NAME_ARABIC_DICTIONARY[clean];
      }
      return w;
    }).join(' ');
  } else {
    if (NAME_ENGLISH_DICTIONARY[trimmed]) return NAME_ENGLISH_DICTIONARY[trimmed];

    const words = trimmed.split(/\s+/);
    return words.map(w => {
      if (NAME_ENGLISH_DICTIONARY[w]) {
        return NAME_ENGLISH_DICTIONARY[w];
      }
      return w;
    }).join(' ');
  }
}

export function formatFacultyName(faculty: string | undefined, isAr: boolean): string {
  if (!faculty) return isAr ? 'مساحة مشتركة' : 'Shared Space';
  const trimmed = faculty.trim();
  const lower = trimmed.toLowerCase();

  if (isAr) {
    if (lower.includes('comp') || lower.includes('eng') || lower.includes('software')) return 'هندسة حاسبات';
    if (lower.includes('med') || lower.includes('pharm')) return 'طب بشري';
    if (lower.includes('art') || lower.includes('design')) return 'فنون تطبيقية';
    if (lower.includes('bus') || lower.includes('comm') || lower.includes('econ')) return 'إدارة أعمال';
    if (lower.includes('shared')) return 'مساحة مشتركة';
    if (lower.includes('private')) return 'مكتب خاص';
    return trimmed;
  } else {
    if (trimmed.includes('حاسبات') || trimmed.includes('هندسة')) return 'Computer Engineering';
    if (trimmed.includes('طب') || trimmed.includes('صيدلة')) return 'Faculty of Medicine';
    if (trimmed.includes('فنون') || trimmed.includes('تصميم')) return 'Applied Arts';
    if (trimmed.includes('أعمال') || trimmed.includes('تجارة')) return 'Business Administration';
    if (trimmed.includes('مشتركة')) return 'Shared Space';
    if (trimmed.includes('خاص')) return 'Private Desk';
    return trimmed;
  }
}

export function formatRoomLocale(roomName: string, isAr: boolean): string {
  if (!roomName) return isAr ? 'قاعة' : 'Room';
  if (isAr) {
    return roomName.replace(/Hall\s*A/i, 'قاعة أ').replace(/Hall\s*B/i, 'قاعة ب').replace(/Room\s*(\d+)/i, 'قاعة $1');
  }
  return roomName;
}

export function formatActivityLocale(activity: string | undefined, isAr: boolean): string {
  if (!activity) return isAr ? 'ورشة عمل تدريبية' : 'Workshop Session';
  return activity;
}

export function formatTimeLocale(timeStr: string | undefined, isAr: boolean): string {
  if (!timeStr) return isAr ? '10:00 ص' : '10:00 AM';
  if (isAr) {
    return timeStr.replace(/PM/i, 'م').replace(/AM/i, 'ص').replace(/pm/i, 'م').replace(/am/i, 'ص');
  }
  return timeStr.replace(/م/g, 'PM').replace(/ص/g, 'AM');
}

