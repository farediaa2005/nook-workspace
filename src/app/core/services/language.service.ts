import { Injectable, signal, computed } from '@angular/core';

export type Lang = 'en' | 'ar';

export interface Translations {
  // Common Actions & Labels
  search: string;
  signOut: string;
  admin: string;
  systemAdmin: string;
  save: string;
  cancel: string;
  edit: string;
  delete: string;
  filter: string;
  export: string;
  actions: string;
  status: string;
  active: string;
  inactive: string;
  all: string;
  view: string;
  phone: string;
  email: string;
  fullName: string;
  date: string;
  time: string;
  price: string;
  notes: string;
  noData: string;
  submit: string;
  loading: string;
  currency: string;

  // Sidebar Groups & Main
  main: string;
  dashboard: string;
  management: string;
  other: string;

  // 1. Workspace
  workspace: string;
  addStudent: string;
  addStudentDesc: string;
  checkInStudent: string;
  checkInStudentDesc: string;
  studentInformation: string;
  sessionAndBilling: string;
  studentName: string;
  whatsapp: string;
  sameAsPhone: string;
  faculty: string;
  printing: string;
  wifi: string;
  wifiVoucher: string;
  extraServices: string;
  pickSpecificDate: string;
  noStudentsFound: string;
  wallet: string;
  egp: string;
  papers: string;
  blacklistAlert: string;
  checkIn: string;
  expectedCheckout: string;
  newSession: string;
  standardHourlyRate: string;
  usePackage: string;
  deductFromHours: string;
  coupon: string;
  applyDiscountCode: string;
  selectPackageCoupon: string;
  sessionPrice: string;
  sessionPricePlaceholder: string;
  selectPackage: string;
  couponCode: string;
  enterCouponPlaceholder: string;
  confirmCheckIn: string;
  showStudents: string;
  showStudentsDesc: string;
  activeStudentsTitle: string;
  activeStudentsSubtitle: string;
  allStudentsDirectory: string;
  registerNewStudentBtn: string;
  contactInfo: string;
  collegeAndFaculty: string;
  packageAndPlan: string;
  visitsAndActivity: string;
  statusOffline: string;
  totalRegisteredStudents: string;
  packageSubscribers: string;
  registerStudentTitle: string;
  registerStudentSubtitle: string;
  insideRightNow: string;
  avgSessionTitle: string;
  todayCheckinsTitle: string;
  checkoutsTodayTitle: string;
  workspaceHistory: string;
  cateringColumn: string;
  actionsColumn: string;
  costColumn: string;
  checkedOutStatus: string;
  statusActive: string;
  statusLeft: string;
  statusBlocked: string;
  blockStudentBtn: string;
  blockConfirmTitle: string;
  blockReasonLabel: string;
  blockReasonPlaceholder: string;
  confirmBlockBtn: string;
  unblockBtn: string;
  blockedDate: string;
  reason: string;
  filterText: string;
  addBtn: string;
  checkOutBtn: string;
  newStudentCheckInBtn: string;
  searchStudentOrFaculty: string;
  allDates: string;
  todayText: string;
  yesterdayText: string;
  thisWeekText: string;
  showingText: string;
  toText: string;
  ofText: string;
  resultsText: string;
  editStudent: string;
  confirmDeleteTitle: string;
  confirmDeleteDesc: string;
  saveChanges: string;
  editText: string;
  deleteText: string;
  userInformation: string;
  emailLabel: string;
  sessionDetails: string;
  lineItems: string;
  billingDetails: string;
  workspaceBaseCost: string;
  facultyDiscount: string;
  addDiscountBtn: string;
  applyBtn: string;
  subtotalText: string;
  discountsApplied: string;
  finalAmountText: string;
  paymentMethodText: string;
  cashText: string;
  vodafoneCashText: string;
  fawryText: string;
  instaPayText: string;
  amountReceivedText: string;
  changeToReturnText: string;
  finalizeAndCloseBtn: string;
  addItemBtn: string;
  ratePerHour: string;
  checkout: string;
  checkoutDesc: string;
  college: string;
  planType: string;
  balance: string;
  saveStudent: string;
  studentId: string;
  joinedDate: string;
  totalStudents: string;
  searchStudents: string;
  checkinTime: string;
  checkoutTime: string;
  duration: string;
  totalDue: string;
  processCheckout: string;

  // 2. Classroom
  classrooms: string;
  addClassroom: string;
  addClassroomDesc: string;
  showClassrooms: string;
  showClassroomsDesc: string;
  classroomCheckout: string;
  classroomCheckoutDesc: string;
  roomName: string;
  capacity: string;
  hourlyRate: string;
  featuresEquipment: string;
  saveClassroom: string;
  availableRooms: string;
  bookedRooms: string;
  classroomLiveBoard: string;
  classroomLiveBoardDesc: string;
  newClassroomBooking: string;
  newClassroomBookingDesc: string;
  configureBookingDetails: string;
  searchClassrooms: string;
  statusAll: string;
  statusScheduled: string;
  statusAvailable: string;
  statusCompleted: string;
  dateToday: string;
  dateThisWeek: string;
  instructor: string;
  startedAt: string;
  elapsed: string;
  rental: string;
  addCatering: string;
  bookRoom: string;
  roomEmptyTitle: string;
  coreDetails: string;
  activitySubject: string;
  phoneNumber: string;
  emailAddress: string;
  ratesAndAddons: string;
  hourlyRateLabel: string;
  printingChargesLabel: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  now: string;
  invalidTimeRange: string;
  logistics: string;
  room: string;
  availabilityConfirmed: string;
  bookingSummary: string;
  roomRental: string;
  printingCharges: string;
  subtotal: string;
  discount: string;
  discountTenPercent: string;
  discountApplied: string;
  total: string;
  confirmBooking: string;
  finalizingSessionFor: string;
  activity: string;
  timing: string;
  financialBreakdown: string;
  perHour: string;
  hrs: string;
  teamLunch: string;
  handouts: string;
  manualAdjustment: string;
  loyaltyDiscount: string;
  specialMemberRate: string;
  finalAmount: string;
  payment: string;
  paymentMethod: string;
  cash: string;
  vodafoneCash: string;
  fawry: string;
  instaPay: string;
  amountReceived: string;
  changeDue: string;
  processPaymentAndFreeRoom: string;
  canteenAndDrinks: string;
  addCanteenOrders: string;
  selectItemsOrCustom: string;
  orEnterCustomAmount: string;
  applyAmount: string;
  cateringTotal: string;
  confirmAndDone: string;
  printingAndPhotocopy: string;
  calcPrintingCharges: string;
  calcByPagesOrCustom: string;
  numberOfPages: string;
  pricePerPage: string;
  printingTotal: string;
  applyAndSave: string;
  editRateAndDuration: string;
  adjustRateAndHours: string;
  hourlyRateEgp: string;
  durationHoursLabel: string;
  rentalTotal: string;
  applyDiscountOrAdjustment: string;
  addDiscountOrAdjustment: string;
  directDiscountAmountPlaceholder: string;
  promoCode: string;
  applyPromoCode: string;
  enterPromoCodePlaceholder: string;
  pleaseEnterCoupon: string;
  invalidCoupon: string;
  overtimeAlertTitle: string;
  gracePeriodNotice: string;
  extraHourChargedNotice: string;
  minutesRemaining: string;
  timeEndedGrace: string;
  overdueByMins: string;
  editHourlyRateTooltip: string;
  removeDiscountTooltip: string;
  removeAdjustmentTooltip: string;
  emptyStateNoClassrooms: string;
  fullHallRental: string;
  fullHallRentalDesc: string;
  fullyCoveredByPackage: string;
  sessionFullyCoveredByPackage: string;
  noAdditionalPaymentRequired: string;
  completeSessionAndFreeRoom: string;
  selectBtn: string;

  // Checkout & Shared Modals
  quickAdd: string;
  discountAndOffers: string;
  paymentSummary: string;
  baseRate: string;
  checkoutCateringTotal: string;
  totalAmount: string;
  creditCard: string;
  processing: string;
  completeCheckout: string;
  pickCustomDate: string;
  selectDate: string;
  noCateringOrdersYet: string;
  apply: string;

  // 3. Packages
  packages: string;
  addStudentPackage: string;
  addStudentPackageDesc: string;
  showStudentPackage: string;
  showStudentPackageDesc: string;
  addInstructorPackage: string;
  addInstructorPackageDesc: string;
  showInstructorPackage: string;
  showInstructorPackageDesc: string;
  packageName: string;
  packageHours: string;
  packagePrice: string;
  validityDays: string;
  savePackage: string;

  // 4. Shifts
  shifts: string;
  activeShift: string;
  shiftHistory: string;
  addShift: string;
  addShiftDesc: string;
  showShift: string;
  showShiftDesc: string;
  searchShift: string;
  searchShiftDesc: string;
  shiftStaffName: string;
  shiftStartTime: string;
  shiftEndTime: string;
  shiftCashDrawer: string;
  saveShift: string;
  openShiftTitle: string;
  secureTerminalInit: string;
  identityLabel: string;
  timestampLabel: string;
  openingCashAmount: string;
  startShiftBtn: string;
  shiftInitReady: string;
  logoutConfirmTitle: string;
  logoutConfirmMessage: string;
  closeShiftAndLogout: string;
  logoutOnly: string;
  liveShift: string;
  staffLabel: string;
  durationLabel: string;
  closeShiftBtn: string;
  paymentChannelsTitle: string;
  paymentChannelsSub: string;
  cashDrawerBadge: string;
  cashTillName: string;
  startingFloatPrefix: string;
  eWalletBadge: string;
  vodafoneCashName: string;
  collectedViaWallet: string;
  instantTransferBadge: string;
  instapayName: string;
  instantBankTransfers: string;
  posMachineBadge: string;
  fawryName: string;
  posPaymentsSub: string;
  categoryRevenuesTitle: string;
  categoryRevenuesSub: string;
  workspaceCategory: string;
  workspaceCategorySub: string;
  classroomsCategory: string;
  classroomsCategorySub: string;
  packagesCategory: string;
  packagesCategorySub: string;
  cateringCategory: string;
  cateringCategorySub: string;
  otherIncomeCategory: string;
  otherIncomeCategorySub: string;
  pettyExpensesCategory: string;
  pettyExpensesSub: string;
  liveLedgerTitle: string;
  recordedTransactionsCount: string;
  timeColumn: string;
  descriptionColumn: string;
  categoryColumn: string;
  paymentChannelColumn: string;
  amountColumn: string;
  systemCategory: string;
  pettyCashMethod: string;
  reconciliationTitle: string;
  reconciliationSubtitle: string;
  financialSummaryTitle: string;
  openingCashLabel: string;
  posReceiptsLabel: string;
  posBadgeText: string;
  pettyCashOutLabel: string;
  vodafoneBalanceLabel: string;
  instapayBalanceLabel: string;
  fawryBalanceLabel: string;
  expectedDrawerCashLabel: string;
  countNoticeText: string;
  declareTotalsTitle: string;
  actualCashLabel: string;
  actualCashHint: string;
  varianceStatusLabel: string;
  pendingInputText: string;
  pendingInputSub: string;
  balancedStatusText: string;
  balancedStatusSub: string;
  discrepancyText: string;
  shortageDetected: string;
  surplusDetected: string;
  confirmCloseShiftBtn: string;
  cancelBtn: string;
  openShiftPopupTitle: string;
  openShiftPopupSub: string;
  openShiftEnterBtn: string;
  autoAuditLogNotice: string;
  startingCashField: string;
  startingVodafoneField: string;
  startingInstapayField: string;
  startingFawryField: string;
  exportExcelBtn: string;
  exportPdfBtn: string;
  shiftHistoryTitle: string;
  shiftHistorySubtitle: string;
  shiftTimeColumn: string;
  cashInColumn: string;
  cashOutColumn: string;
  finalTotalColumn: string;
  varianceColumn: string;
  statusColumn: string;
  balancedStatusPill: string;
  disputedStatusPill: string;
  noShiftsFound: string;
  showingShiftsSummary: string;
  searchShiftPlaceholder: string;
  allStaffOption: string;
  allStatusesOption: string;
  balancedOption: string;
  disputedOption: string;
  applyFiltersBtn: string;
  noActiveShiftTitle: string;
  noActiveShiftDesc: string;
  startNewShiftBtn: string;
  activeShiftRunningNotice: string;
  goToActiveShiftBtn: string;
  startingFloatsTitle: string;
  shiftNotesTitle: string;
  shiftNotesPlaceholder: string;
  totalCollectedRevenue: string;
  disputedShiftsCount: string;
  balancedShiftsCount: string;
  viewShiftDetails: string;
  shiftDetailsTitle: string;
  backToHistoryBtn: string;
  backToActiveShiftBtn: string;
  financialLedgerSub: string;
  resetFiltersBtn: string;
  summaryCards: string;
  digitalChannelsReconcile: string;

  // 5. Bookings / Reservations
  bookings: string;
  addReservation: string;
  addReservationDesc: string;
  showReservation: string;
  showReservationDesc: string;
  reserverName: string;
  reservationDate: string;
  reservationTimeSlot: string;
  assignedSpace: string;
  depositAmount: string;
  saveReservation: string;
  reservation: string;
  adminConsole: string;
  adminConsoleDesc: string;
  todaysReservations: string;
  reservationDetails: string;
  confirmed: string;
  upcoming: string;
  costBreakdown: string;
  baseRateLabel: string;
  equipmentAddon: string;
  earlyBirdDiscount: string;
  studentsCount: string;
  cancelReservation: string;
  classroomLabel: string;
  idLabel: string;
  costLabel: string;
  reservations: string;
  charsLeft: string;
  digitsLeft: string;
  errorInstructor: string;
  errorActivity: string;
  errorPhone: string;
  errorEmail: string;
  timeAlertCrossMidnight: string;
  timeAlertOverlap: string;
  statusActiveDropdown: string;
  statusAvailableDropdown: string;
  cateringSubtitle: string;
  addCateringLabel: string;
  btnProcessCheckout: string;
  starts: string;
  ends: string;
  cancelled: string;
  errorAmountReceivedLow: string;
  instructorPlaceholder: string;
  activityPlaceholder: string;
  phonePlaceholder: string;
  emailPlaceholder: string;
  instructorPackage: string;
  deductFromPackage: string;
  payCashDirect: string;
  packageBalance: string;
  remainingHoursLabel: string;
  noActivePackage: string;
  deductedFromPackage: string;
  selectPackageOrCash: string;
  packageActiveBadge: string;
  ratesAndTiming: string;

  // 6. Details
  membersInfo: string;
  addDiscount: string;
  addDiscountDesc: string;
  discountCode: string;
  discountPercent: string;
  saveDiscount: string;
  showColleges: string;
  showCollegesDesc: string;
  showBlacklist: string;
  showBlacklistDesc: string;
  showInstructors: string;
  showInstructorsDesc: string;
  instructorName: string;
  specialization: string;
  discountsAndPromoCodes: string;
  discountsPageSubtitle: string;
  createPromoCodeBtn: string;
  searchDiscountsPlaceholder: string;
  activePromoCodes: string;
  totalTimesUsed: string;
  totalDiscountValue: string;
  titleDescription: string;
  discountValue: string;
  applicableOn: string;
  validityPeriod: string;
  usageLimitTh: string;
  copyCode: string;
  statusDisabled: string;
  allServicesAndSessions: string;
  studentSessionsOnly: string;
  instructorWorkshopsOnly: string;
  hourPacksAndRooms: string;
  createNewPromoCodeTitle: string;
  editPromoCodeTitle: string;
  autoGenerate: string;
  discountType: string;
  percentageType: string;
  fixedAmountType: string;
  startDate: string;
  expirationDate: string;
  saveCode: string;
  confirmDeleteDiscountTitle: string;
  confirmDeleteDiscountDesc: string;
  deleteCodeBtn: string;
  blacklistPageTitle: string;
  blacklistPageSubtitle: string;
  addBlockBtn: string;
  searchBlacklistPlaceholder: string;
  activeBannedCount: string;
  tempRestrictionsCount: string;
  permanentRestrictionsCount: string;
  resolvedCasesCount: string;
  memberLabel: string;
  violationReason: string;
  blockType: string;
  blockDate: string;
  unblockAction: string;
  temporary: string;
  permanent: string;
  bannedStatus: string;
  resolvedStatus: string;
  addBlacklistModalTitle: string;
  searchMemberOrEnter: string;
  selectSeverity: string;
  tempBlock30Days: string;
  permBlockFinal: string;
  violationDetailsPlaceholder: string;
  adminNotesOptional: string;
  confirmBlockActionBtn: string;
  confirmUnblockTitle: string;
  confirmUnblockDesc: string;
  yesUnblockBtn: string;
  noBlacklistFound: string;
  collegesPageTitle: string;
  collegesPageSubtitle: string;
  addCollegeBtn: string;
  searchCollegesPlaceholder: string;
  totalColleges: string;
  totalAffiliatedStudents: string;
  topFaculty: string;
  collegeNameLabel: string;
  universityLabel: string;
  campusLocation: string;
  studentsCountTh: string;
  addCollegeModalTitle: string;
  editCollegeModalTitle: string;
  collegeNameAr: string;
  collegeNameEn: string;
  universityAr: string;
  campusAr: string;
  saveCollegeBtn: string;
  confirmDeleteCollegeTitle: string;
  confirmDeleteCollegeDesc: string;
  instructorsPageTitle: string;
  instructorsPageSubtitle: string;
  addInstructorBtn: string;
  searchInstructorsPlaceholder: string;
  totalInstructors: string;
  activeInstructors: string;
  totalWorkshopsGiven: string;
  instructorTh: string;
  specialtyTh: string;
  affiliationTh: string;
  sessionsCountTh: string;
  addInstructorModalTitle: string;
  editInstructorModalTitle: string;
  instructorNameLabel: string;
  specialtyLabel: string;
  affiliationLabel: string;
  bioLabel: string;
  saveInstructorBtn: string;
  confirmDeleteInstructorTitle: string;
  confirmDeleteInstructorDesc: string;

  // 7. Catering
  catering: string;
  addProducts: string;
  addProductsDesc: string;
  showProducts: string;
  showProductsDesc: string;
  productGraph: string;
  productGraphDesc: string;
  productName: string;
  productCategory: string;
  productPrice: string;
  stockQuantity: string;
  saveProduct: string;
  salesStats: string;
  done: string;

  // Catering Popups, POS & Pages
  addNewProduct: string;
  addNewProductSubtitle: string;
  productDetails: string;
  productNameEnLabel: string;
  productNameEnPlaceholder: string;
  productNameArLabel: string;
  productNameArPlaceholder: string;
  categoryRequired: string;
  sellingPriceRequired: string;
  costPriceRequired: string;
  stockQtyOptional: string;
  expirationDateLabel: string;
  expirationDatePlaceholder: string;
  saveProductBtn: string;
  pleaseEnterProductName: string;
  categorySnacks: string;
  categoryMerchandise: string;
  categoryBeverages: string;
  categoryCoffee: string;
  categoryMeals: string;
  allCategories: string;
  productGraphHeaderTitle: string;
  productGraphHeaderDesc: string;
  nookCanteen: string;
  today: string;
  thisWeek: string;
  thisMonth: string;
  totalRevenue: string;
  mostPopularItem: string;
  unitsSoldToday: string;
  averageOrderValue: string;
  revenueByCategory: string;
  transactions: string;
  cardPayment: string;
  appPayment: string;
  cashPayment: string;
  topProductsByRevenue: string;
  viewAll: string;
  thProduct: string;
  thSellingPrice: string;
  thCostPrice: string;
  thStock: string;
  thSales: string;
  thRevenue: string;
  thExpiration: string;
  thStatus: string;
  thActions: string;
  exportData: string;
  exportProductsCsvTitle: string;
  addProduct: string;
  searchProductPlaceholder: string;
  statusHealthy: string;
  statusLowStock: string;
  statusExpiringSoon: string;
  statusExpired: string;
  editProduct: string;
  confirmDeleteProduct: string;
  noProductsFound: string;
  showing: string;
  to: string;
  of: string;
  entries: string;
  prev: string;
  next: string;
  editProductTitle: string;
  priceBelowCostWarning: string;
  productIdentity: string;
  barcodeSerial: string;
  pricingSection: string;
  sellingPriceLabel: string;
  costPriceLabel: string;
  expirationDateOptional: string;
  inventorySection: string;
  initialStock: string;
  reorderLevel: string;
  productImage: string;
  uploadProductImage: string;
  productAddedSuccess: string;
  productAddedDesc: string;
  inStockLabel: string;
  addAnother: string;
  viewInventory: string;
  posCanteen: string;
  currentOrder: string;
  allItems: string;
  directCashSale: string;
  orderCompletedSuccess: string;
  emptyCartMessage: string;
  clearCart: string;
  productNamePlaceholder: string;
  addNewCategoryOption: string;
  newCategoryNamePlaceholder: string;
  barcodeOptional: string;
  barcodeLeaveEmpty: string;
  pricingAndCost: string;
  financialLossWarning: string;
  noExpiration: string;
  noExpirationChecked: string;
  noExpirationDisplay: string;
  selectExpirationDate: string;
  inventoryAndStock: string;
  boxCalculator: string;
  numberOfBoxes: string;
  unitsPerBox: string;
  boxPlaceholder: string;
  unitsPlaceholder: string;
  totalCalculatedStock: string;
  unitsLabel: string;
  reorderThreshold: string;
  productImageOptional: string;
  imageFileFormat: string;
  removeImage: string;
  addProductToInventory: string;
  cashierLabel: string;
  sessionCatering: string;
  viewPreviousOrders: string;
  previousOrders: string;
  itemsCount: string;
  itemsPreviouslyBilled: string;
  itemsPreviouslyBilledDesc: string;
  previousTotal: string;
  hide: string;
  noDetailedItemsRecorded: string;
  searchProductsQuick: string;
  outOfStock: string;
  clickToAddToOrder: string;
  inStock: string;
  noMatchingProductsInCategory: string;
  cartEmptyTitle: string;
  cartEmptyDesc: string;
  addToRoomSessionBtn: string;
  saleSuccessShift: string;
  barcodeLabel: string;
  previousCategories: string;
  nextCategories: string;
  addedToRoomAndShiftSuccess: string;

  // 8. Settings
  settings: string;
  addUser: string;
  addUserDesc: string;
  showUsers: string;
  showUsersDesc: string;
  userRole: string;
  saveUser: string;
  systemSettingsTitle: string;
  systemSettingsSubtitle: string;
  addPricingTierBtn: string;
  addRoomSpaceBtn: string;
  addPackagePresetBtn: string;
  studentHourlyPricingTab: string;
  classroomsZonesTab: string;
  quickPackagePresetsTab: string;
  packageTargetLabel: string;
  studentPackagesFilter: string;
  instructorPackagesFilter: string;
  allPackagesFilter: string;
  studentPackageTypeOption: string;
  instructorPackageTypeOption: string;
  packageAudienceHeader: string;
  studentBadgeText: string;
  instructorBadgeText: string;
  fromHoursHeader: string;
  toHoursHeader: string;
  duePriceHeader: string;
  tierDescriptionHeader: string;
  noPricingTiersAdded: string;
  noPackagePresetsAdded: string;
  roomCapacityCap: string;
  egpPerHourShort: string;
  defaultValidity: string;
  addNewTierModalTitle: string;
  editTierModalTitle: string;
  fromHoursLabel: string;
  toHoursLabel: string;
  priceDueLabel: string;
  arabicLabelDesc: string;
  saveTierBtn: string;
  addNewRoomModalTitle: string;
  editRoomModalTitle: string;
  spaceTypeLabel: string;
  capacityStudentsLabel: string;
  roomImageUrlLabel: string;
  roomImageUploadLabel: string;
  clickToUploadRoomImage: string;
  roomImageFileFormatHint: string;
  saveRoomBtn: string;
  addNewPackagePresetModalTitle: string;
  editPackagePresetModalTitle: string;
  packageHoursLabel: string;
  customValidityDaysLabel: string;
  customOptionLabel: string;
  customDaysPlaceholder: string;
  quickPresetHoursLabel: string;
  savePackagePresetBtn: string;
  systemUsersRolesTitle: string;
  systemUsersRolesSubtitle: string;
  searchUsersPlaceholder: string;
  addNewUserBtn: string;
  totalUsersKpi: string;
  adminsSupervisorsKpi: string;
  receptionCashiersKpi: string;
  userAccountTh: string;
  rolePermissionTh: string;
  accountStatusTh: string;
  createdDateTh: string;
  adminManagerRole: string;
  supervisorRole: string;
  receptionCashierRole: string;
  memberRole: string;
  statusActiveText: string;
  statusDisabledText: string;
  noUsersFoundTitle: string;
  noUsersFoundSubtitle: string;
  showingUsersSummary: string;
  addNewUserModalTitle: string;
  editUserModalTitle: string;
  usernameLabel: string;
  passwordLabel: string;
  resetPasswordOptional: string;
  rolePermissionLabel: string;
  classroomOption: string;
  silentZoneOption: string;
  sharedSpaceOption: string;
  tierLabelPlaceholder: string;
  packagePresetPlaceholder: string;
  validFromHoursRequired: string;
  toHoursGreaterThanFrom: string;
  validPriceRequired: string;
  roomNameRequired: string;
  packageHoursRequired: string;

  // Dashboard Overview
  welcome: string;
  welcomeBack: string;
  dashboardSubtitle: string;
  viewBookings: string;
  activeBookings: string;
  availableDesks: string;
  activeMembers: string;
  occupancyRate: string;
  thisMonthTrend: string;
  readyToBook: string;
  activeNow: string;
  goodPerformance: string;
  bookingsByDay: string;
  spaceDistribution: string;
  privateDesks: string;
  sharedSpaces: string;
  meetingRooms: string;
  contentArea: string;
  contentDesc1: string;
  contentDesc2: string;
  createAndManageDiscounts: string;
  fastCheckInDesc: string;
  quickCheckIn: string;
  configureNewRoomDesc: string;
  setupRoom: string;
  shiftHandoverDesc: string;
  activityOccupancyFlow: string;
  peakToday: string;
  todayHourly: string;
  weekly: string;
  peakTime: string;
  avgSession: string;
  totalFootfall: string;
  currentActiveStudents: string;
  deskSpace: string;
  todaysRoomBookings: string;
  viewSchedule: string;
  inProgress: string;
  seatsLabel: string;

  // 9. Packages (Student & Instructor)
  details: string;
  packagesTitle: string;
  studentPackagesTitle: string;
  studentPackagesSubtitle: string;
  instructorPackagesTitle: string;
  instructorPackagesSubtitle: string;
  sellStudentPackage: string;
  sellInstructorPackage: string;
  sellStudentPackageTitle: string;
  sellStudentPackageSubtitle: string;
  sellInstructorPackageTitle: string;
  sellInstructorPackageSubtitle: string;
  activeStudentPasses: string;
  activeInstructorPacks: string;
  totalRemainingBalance: string;
  expiringSoonLow: string;
  studentPackagesValue: string;
  instructorPackagesValue: string;
  allPackages: string;
  activePasses: string;
  exhaustedPasses: string;
  expiredPasses: string;
  nearExpiryPasses: string;
  statusActivePass: string;
  statusNearExpiryPass: string;
  statusExhaustedPass: string;
  statusExpiredPass: string;
  searchStudentPackagePlaceholder: string;
  searchInstructorPackagePlaceholder: string;
  studentOrMembers: string;
  instructorOrEntity: string;
  allocatedHours: string;
  usedHours: string;
  remainingHours: string;
  costCost: string;
  expiryDate: string;
  noStudentPackagesFound: string;
  noInstructorPackagesFound: string;
  groupStudentsCount: string;
  showingPackagesSummary: string;
  viewDetailsAndHistory: string;
  deletePackageAction: string;
  memberDataSection: string;
  instructorDataSection: string;
  searchMemberLabel: string;
  searchInstructorLabel: string;
  searchMemberInputPlaceholder: string;
  searchInstructorInputPlaceholder: string;
  addMemberBadge: string;
  dateAndValiditySection: string;
  packageStartDate: string;
  packageExpiryDate: string;
  packageNotesPlaceholder: string;
  selectHoursPackage: string;
  customPackageHours: string;
  customPackageRate: string;
  packageSummaryAndPayment: string;
  selectedPackageLabel: string;
  studentsCountLabel: string;
  instructorsCountLabel: string;
  hoursQuota: string;
  effectiveRatePerHour: string;
  totalDueRequired: string;
  hideDiscount: string;
  addDiscountCoupon: string;
  enterCouponCodePlaceholder: string;
  paymentMethodLabel: string;
  vodafonePayment: string;
  instapayPayment: string;
  fawryPayment: string;
  amountReceivedLabel: string;
  amountReceivedPlaceholder: string;
  cashShortAlert: string;
  changeDueCustomer: string;
  confirmAndCompleteSale: string;
  packageValidityDays: string;
  optionsCount: string;
  egpPerHour: string;
  studentPassTag: string;
  instructorPassTag: string;
  enrolledGroupMembers: string;
  remainingBalanceRate: string;
  consumedLabel: string;
  remainingLabel: string;
  totalLabel: string;
  costPaid: string;
  purchasedDate: string;
  expiryAndNotesSettings: string;
  unlockEdit: string;
  lockEdit: string;
  savePackageModifications: string;
  usageSessionsLog: string;
  registeredSessionsCount: string;
  deductHoursBtn: string;
  noUsageSessionsYet: string;
  closeBtn: string;
  deductSessionTitle: string;
  deductSessionSubtitle: string;
  sessionTitleLabel: string;
  hoursToDeductLabel: string;
  deskLocationLabel: string;
  confirmDeductionBtn: string;
  confirmDeleteStudentPackageTitle: string;
  confirmDeleteInstructorPackageTitle: string;
  confirmDeleteStudentPackageDesc: string;
  confirmDeleteInstructorPackageDesc: string;
  adminPasswordConfirmation: string;
  adminPasswordPlaceholder: string;
  yesDeletePackage: string;
  // Roles & Permissions Matrix
  rolesAndPermissionsTab: string;
  rolesMatrixTitle: string;
  rolesMatrixSubtitle: string;
  adminRoleBadge: string;
  adminRoleDesc: string;
  supervisorRoleBadge: string;
  supervisorRoleDesc: string;
  receptionistRoleBadge: string;
  receptionistRoleDesc: string;
  memberRoleBadge: string;
  memberRoleDesc: string;
  moduleAndFeatureColumn: string;

  // Shift & Cash Ledger
  adminFundLabel: string;
  insideFlow: string;
  outsideFlow: string;
  insideFlowFull: string;
  outsideFlowFull: string;
  searchTransactionsPlaceholder: string;
  allPaymentChannels: string;
  twoShiftsRunningWarning: string;
  printShiftSummaryBtn: string;
  closingNotesLabel: string;

  // Packages Management
  editPackageTitle: string;
  editInstructorPackageTitle: string;
  totalHoursLabel: string;
  totalCostLabel: string;
  expiryDateLabel: string;
  notesLabel: string;

  // Classroom Reservations
  newReservation: string;
  newReservationTitle: string;
  duplicateReservationBtn: string;
  duplicateReservationTitle: string;
  editReservationTitle: string;
  splitReservationBtn: string;
  splitReservationTitle: string;
  splitIntervalDesc: string;
  cutStartTime: string;
  cutEndTime: string;
  splitNote: string;
  confirmSplitBtn: string;
  deleteReservationBtn: string;
  copySuffix: string;

  // Catering Products
  savingProduct: string;
  addingProduct: string;
  productExpiredTooltip: string;
  expiredStatus: string;

  // Workspace & Checkout
  printingLabel: string;
  printingPagesRate: string;
  premiumWiFi: string;
  paidDeposit: string;
  discountReduction: string;
  studentPackageMethod: string;
  partialPaymentDue: string;
  applyDiscountTitle: string;
  discountTypeLabel: string;
  percentageOption: string;
  fixedAmountOption: string;
  percentageValueLabel: string;
  discountAmountLabel: string;
  exportDisplayedResults: string;
  exportDisplayedToCSV: string;
  deleteSession: string;
  showingLabel: string;
  toLabel: string;
  ofLabel: string;
  activeStudentsCountLabel: string;
  historyStudentsCountLabel: string;
  perPageLabel: string;
  workshopSession: string;
  sharedSpace: string;
  duringSession: string;
  baseSessionCost: string;
  drinksAndSnacksSub: string;
  addCateringItemBtn: string;
  printingHandoutsSub: string;
  processPaymentAndFree: string;
  studentNameRequired: string;
  phoneNumberRequired: string;
  noDataToExport: string;
  resultsExportedSuccess: string;
  invalidCouponCode: string;

  // Details & Settings Messages
  threeWordsNameRequired: string;
  validEmailFormatRequired: string;
  promoCodeRequired: string;
  discountTitleRequired: string;
  expiryDateRequired: string;
  expiryDateCannotBePast: string;
  collegeNameRequired: string;
  universityNameRequired: string;
  memberNameRequired: string;
  blockReasonRequired: string;
  namePlaceholderExample: string;
  usernamePlaceholderExample: string;
  editStudentTitle: string;
  editStudentSubtitle: string;
  existingStudentDetected: string;
  quickStudentSearch: string;
  quickStudentSearchPlaceholder: string;
  activePackageBadge: string;
  standardSessionBadge: string;
  dateTimeSection: string;
  startTimeLabel: string;
  openTimeBadge: string;
  openSessionToggle: string;
  nowBtn: string;
  invalidTimeRangeNotice: string;
  paymentMethodAndPackage: string;
  deductFromHoursPackage: string;
  noActivePackageForStudent: string;
  selectRoomArea: string;
  sharedSpaceRooms: string;
  silentZoneRooms: string;
  extraServicesAndAmenities: string;
  printingPagesLabel: string;
  packageAndServicesDetails: string;
  digitalChannelsActualBalances: string;
  cutSubRangeInvalid: string;
  confirmDeleteBookingPrompt: string;
  adminAccountProtected: string;
  cannotDeleteOwnAccount: string;
  cannotDeleteLastAdmin: string;
  noTransactionsForChannel: string;
  requiredText: string;
  totalOpeningFloatBalance: string;
  frontDeskStaff: string;
  clickToViewShiftDetails: string;
  studentsUnit: string;
  estimatedCollegeCapacity: string;
  derivedFromRegisteredColleges: string;
  discountOffBadge: string;
  general: string;
  bookingSummaryHeading: string;
  selectedRoomLabel: string;
  egpPerHourRate: string;
  planTypeLabel: string;
  packageDeductionLabel: string;
  estimatedDurationLabel: string;
  openEndedSessionLabel: string;
  hoursUnit: string;
  printingFeeLabel: string;
  pagesUnit: string;
  walletDepositLabel: string;
  amMarker: string;
  pmMarker: string;
  egpPerPage: string;
  wifiVoucherPlaceholder: string;
  freshOrangeJuicePlaceholder: string;
  hrsBadge: string;
}

const TRANSLATIONS: Record<Lang, Translations> = {
  en: {
    search: 'Search...',
    signOut: 'Sign out',
    admin: 'Admin',
    systemAdmin: 'System Admin',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    filter: 'Filter',
    export: 'Export CSV',
    actions: 'Actions',
    status: 'Status',
    active: 'Active',
    inactive: 'Inactive',
    all: 'All',
    view: 'View',
    phone: 'Phone Number',
    email: 'Email Address',
    fullName: 'Full Name',
    date: 'Date',
    time: 'Time',
    price: 'Price (EGP)',
    notes: 'Notes',
    noData: 'No records found.',
    submit: 'Submit',
    loading: 'Loading...',
    currency: 'EGP',

    main: 'Main',
    dashboard: 'Dashboard',
    management: 'Management',
    other: 'Other',

    // 1. Workspace
    workspace: 'Workspace',
    addStudent: 'Add Student',
    addStudentDesc: 'Register a new student into the workspace system',
    checkInStudent: 'Check In Student',
    checkInStudentDesc: 'Fill in the student details and session information.',
    studentInformation: '1. Student Information',
    sessionAndBilling: '2. Session & Billing',
    studentName: 'STUDENT NAME',
    whatsapp: 'WHATSAPP',
    sameAsPhone: 'Same as phone',
    faculty: 'FACULTY',
    printing: 'PRINTING (PAGES)',
    wifi: 'WIFI',
    wifiVoucher: 'WiFi Voucher',
    extraServices: '3. Extra Services & Amenities',
    pickSpecificDate: 'Pick Specific Date:',
    noStudentsFound: 'No students found for the selected date or search query.',
    wallet: 'WALLET (EGP)',
    egp: 'EGP',
    papers: 'pages',
    blacklistAlert: 'Student is blacklisted for: Repeated noise complaints.',
    checkIn: 'CHECK-IN',
    expectedCheckout: 'EXPECTED CHECKOUT',
    newSession: 'New Session',
    standardHourlyRate: 'Standard hourly rate',
    usePackage: 'Use Package',
    deductFromHours: 'Deduct from hours',
    coupon: 'Coupon',
    applyDiscountCode: 'Apply discount code',
    selectPackageCoupon: 'SELECT COUPON',
    sessionPrice: 'SESSION HOURLY RATE (EGP)',
    sessionPricePlaceholder: 'e.g. 40',
    selectPackage: 'SELECT PACKAGE',
    couponCode: 'COUPON CODE ',
    enterCouponPlaceholder: 'coupon number',
    confirmCheckIn: 'Confirm Check-In',
    showStudents: 'Show Students',
    showStudentsDesc: 'List and directory of all registered students',
    activeStudentsTitle: 'Show Students',
    activeStudentsSubtitle: 'Currently checked-in workspace members',
    allStudentsDirectory: 'All Students Directory',
    registerNewStudentBtn: 'Register New Student',
    contactInfo: 'Contact Info',
    collegeAndFaculty: 'Faculty & College',
    packageAndPlan: 'Package / Plan',
    visitsAndActivity: 'Visits & Activity',
    statusOffline: 'Offline',
    totalRegisteredStudents: 'Total Registered Students',
    packageSubscribers: 'Package Subscribers',
    registerStudentTitle: 'Register New Student',
    registerStudentSubtitle: 'Add student details directly to database directory',
    insideRightNow: 'Inside Right Now',
    avgSessionTitle: 'Avg. Session',
    todayCheckinsTitle: "Today's Check-ins",
    checkoutsTodayTitle: 'Checkouts Today',
    workspaceHistory: 'Workspace History',
    cateringColumn: 'CATERING',
    actionsColumn: 'ACTIONS',
    costColumn: 'COST',
    checkedOutStatus: 'Checked Out',
    statusActive: 'Active',
    statusLeft: 'Left',
    statusBlocked: 'Blocked',
    blockStudentBtn: 'Block',
    blockConfirmTitle: 'Block Student ',
    blockReasonLabel: 'Reason for Blacklisting',
    blockReasonPlaceholder: 'e.g. Repeated noise complaints, unpaid dues, violation of rules...',
    confirmBlockBtn: 'Block',
    unblockBtn: 'Unblock',
    blockedDate: 'Blocked Date',
    reason: 'Reason',
    filterText: 'Filter',
    addBtn: 'Add',
    checkOutBtn: 'Check Out',
    newStudentCheckInBtn: 'Add Student',
    searchStudentOrFaculty: 'Search student or faculty...',
    allDates: 'All Dates',
    todayText: 'Today',
    yesterdayText: 'Yesterday',
    thisWeekText: 'This Week',
    showingText: 'Showing',
    toText: 'to',
    ofText: 'of',
    resultsText: 'active students',
    editStudent: 'Edit Student Details',
    confirmDeleteTitle: 'Delete Student Session',
    confirmDeleteDesc: 'Are you sure you want to delete this student session? This action cannot be undone.',
    saveChanges: 'Save Changes',
    editText: 'Edit',
    deleteText: 'Delete',
    userInformation: 'User Information',
    emailLabel: 'Email',
    sessionDetails: 'Session Details',
    lineItems: 'Line Items',
    billingDetails: 'BILLING DETAILS',
    workspaceBaseCost: 'Workspace Base Cost',
    facultyDiscount: 'Faculty Discount',
    addDiscountBtn: '+ ADD DISCOUNT',
    applyBtn: 'Apply',
    subtotalText: 'Subtotal',
    discountsApplied: 'Discounts Applied',
    finalAmountText: 'Final Amount',
    paymentMethodText: 'Payment Method',
    cashText: 'Cash',
    vodafoneCashText: 'Vodafone Cash',
    fawryText: 'Fawry',
    instaPayText: 'InstaPay',
    amountReceivedText: 'Amount Received',
    changeToReturnText: 'Change to Return',
    finalizeAndCloseBtn: 'Finalize & Close Session',
    addItemBtn: '+ ADD ITEM',
    ratePerHour: '/hr',
    checkout: 'Checkout',
    checkoutDesc: 'Calculate hours, bill session, and checkout student',
    college: 'College',
    planType: 'Plan',
    balance: ' Balance (EGP)',
    saveStudent: 'Save Student',
    studentId: 'Student ID',
    joinedDate: 'Joined Date',
    totalStudents: 'Total Students',
    searchStudents: 'Search by name, phone or university...',
    checkinTime: 'Check-in Time',
    checkoutTime: 'Check-out Time',
    duration: 'Total Duration',
    totalDue: 'Total Due (EGP)',
    processCheckout: 'Complete & Checkout',

    // 2. Classroom
    classrooms: 'Classrooms',
    addClassroom: 'Add Classroom',
    addClassroomDesc: 'Add a new classroom or workshop space',
    showClassrooms: 'Show Classrooms',
    showClassroomsDesc: 'Explore all classrooms and capacity status',
    classroomCheckout: 'Classroom Checkout',
    classroomCheckoutDesc: 'Finalizing session for classroom bookings',
    roomName: 'Classroom Name',
    capacity: 'Capacity (Seats)',
    hourlyRate: 'Hourly Rate (EGP)',
    featuresEquipment: 'Equipment & Amenities',
    saveClassroom: 'Save Classroom',
    availableRooms: 'Available Rooms',
    bookedRooms: 'Booked Rooms',
    classroomLiveBoard: 'Classroom Live Board',
    classroomLiveBoardDesc: 'Real-time status of all educational spaces.',
    newClassroomBooking: 'New Classroom Booking',
    newClassroomBookingDesc: 'Configure session details and resources.',
    configureBookingDetails: 'Configure session details and resources.',
    searchClassrooms: 'Search classrooms, instructors...',
    statusAll: 'Status: All',
    statusScheduled: 'Scheduled',
    statusAvailable: 'Available',
    statusCompleted: 'Completed',
    dateToday: 'Date: Today',
    dateThisWeek: 'Date: This Week',
    instructor: 'INSTRUCTOR',
    startedAt: 'Started',
    elapsed: 'elapsed',
    rental: 'RENTAL',
    addCatering: 'Add Catering',
    bookRoom: 'Book Room',
    roomEmptyTitle: 'This room is currently empty and ready for booking.',
    coreDetails: 'Core Details',
    activitySubject: 'ACTIVITY / SUBJECT',
    phoneNumber: 'PHONE NUMBER',
    emailAddress: 'EMAIL ADDRESS',
    ratesAndAddons: 'Rates & Add-ons',
    hourlyRateLabel: 'HOURLY RATE (EGP)',
    printingChargesLabel: 'PRINTING CHARGES (EGP)',
    bookingDate: 'BOOKING DATE',
    startTime: 'START TIME',
    endTime: 'END TIME',
    now: 'Now',
    invalidTimeRange: 'End time must be after start time',
    logistics: 'Logistics',
    room: 'ROOM',
    availabilityConfirmed: 'Availability Confirmed',
    bookingSummary: 'BOOKING SUMMARY',
    roomRental: 'Room Rental',
    printingCharges: 'Printing Charges',
    subtotal: 'Subtotal',
    discount: 'Discount',
    discountTenPercent: '10% OFF',
    discountApplied: 'Discount Applied',
    total: 'Total',
    confirmBooking: 'Confirm Booking',
    finalizingSessionFor: 'Finalizing session for',
    activity: 'ACTIVITY',
    timing: 'TIMING',
    financialBreakdown: 'Financial Breakdown',
    perHour: '/hr',
    hrs: 'hrs',
    teamLunch: 'Team Lunch',
    handouts: 'Handouts',
    manualAdjustment: 'Manual Adjustment',
    loyaltyDiscount: 'Loyalty Discount',
    specialMemberRate: 'Special Rate',
    finalAmount: 'Final Amount',
    payment: 'Payment',
    paymentMethod: 'Payment Method',
    cash: 'Cash',
    vodafoneCash: 'Vodafone Cash',
    fawry: 'Fawry',
    instaPay: 'InstaPay',
    amountReceived: 'Amount Received',
    changeDue: 'Change Due',
    processPaymentAndFreeRoom: 'Process Payment & Free Room',
    canteenAndDrinks: 'Canteen & Drinks',
    addCanteenOrders: 'Add Canteen & Catering Items',
    selectItemsOrCustom: 'Select items or enter custom amount',
    orEnterCustomAmount: 'Or Enter Custom Amount (EGP)',
    applyAmount: 'Apply Amount',
    cateringTotal: 'Catering Total:',
    confirmAndDone: 'Confirm & Done',
    printingAndPhotocopy: 'Printing & Photocopying',
    calcPrintingCharges: 'Printing & Photocopying Charges',
    calcByPagesOrCustom: 'Calculate by page count or set custom total',
    numberOfPages: 'Number of Pages',
    pricePerPage: 'Price Per Page',
    printingTotal: 'Printing Total:',
    applyAndSave: 'Apply & Save',
    editRateAndDuration: 'Edit Hourly Rate & Duration',
    adjustRateAndHours: 'Adjust hourly rental rate and logged session hours',
    hourlyRateEgp: 'Hourly Rate (EGP / hr)',
    durationHoursLabel: 'Duration (Hours)',
    rentalTotal: 'Rental Total:',
    applyDiscountOrAdjustment: 'Apply Discount / Adjustment',
    addDiscountOrAdjustment: 'Add Discount / Adjustment',
    directDiscountAmountPlaceholder: 'Discount Amount (EGP)',
    promoCode: 'Promo Code',
    applyPromoCode: 'Apply Coupon',
    enterPromoCodePlaceholder: 'Enter promo code',
    pleaseEnterCoupon: 'Please enter a promo code',
    invalidCoupon: 'Invalid promo code',
    overtimeAlertTitle: 'Overtime Alert - Extra Hour Charged:',
    gracePeriodNotice: 'Within 10m grace period — No extra charge',
    extraHourChargedNotice: 'Overdue (Exceeded 10m grace period) — Extra hour charged',
    minutesRemaining: 'm remaining before end',
    timeEndedGrace: 'Time ended (Grace period: {mins}/10m)',
    overdueByMins: 'Overdue by {mins}m (+{hours}h extra charged)',
    editHourlyRateTooltip: 'Edit Hourly Rate',
    removeDiscountTooltip: 'Remove Discount',
    removeAdjustmentTooltip: 'Remove Adjustment',
    emptyStateNoClassrooms: 'No classrooms found matching your search.',
    fullHallRental: 'Full Hall Rental (Exclusive)',
    fullHallRentalDesc: 'Includes entire room & full seating capacity',
    fullyCoveredByPackage: 'Fully covered by package balance',
    sessionFullyCoveredByPackage: 'Session fully covered by package balance',
    noAdditionalPaymentRequired: 'No additional payment required',
    completeSessionAndFreeRoom: 'Complete Session & Free Room',
    selectBtn: 'Select',

    // Checkout & Shared Modals
    quickAdd: 'Quick Add',
    discountAndOffers: 'Discounts & Offers',
    paymentSummary: 'Payment Summary',
    baseRate: 'Session Cost',
    checkoutCateringTotal: 'Catering Total',
    totalAmount: 'Total to Pay',
    creditCard: 'Credit / Debit Card',
    processing: 'Processing...',
    completeCheckout: 'Complete Checkout',
    pickCustomDate: 'Pick specific date',
    selectDate: 'Select Date',
    noCateringOrdersYet: 'No catering items added yet',
    apply: 'Apply',

    // 3. Packages
    packages: 'Packages',
    addStudentPackage: 'Add Student Package',
    addStudentPackageDesc: 'Create a new bundle or membership plan for students',
    showStudentPackage: 'Show Student Packages',
    showStudentPackageDesc: 'View all active student discount bundles',
    addInstructorPackage: 'Add Instructor Package',
    addInstructorPackageDesc: 'Configure course/instructor booking packages',
    showInstructorPackage: 'Show Instructor Packages',
    showInstructorPackageDesc: 'View all instructor and corporate packages',
    packageName: 'Package Name',
    packageHours: 'Included Hours',
    packagePrice: 'Package Price (EGP)',
    validityDays: 'Validity (Days)',
    savePackage: 'Save Package',

    // 4. Shifts
    shifts: 'Shifts',
    activeShift: 'Active Shift',
    shiftHistory: 'Shift History',
    addShift: 'Add Shift',
    addShiftDesc: 'Start and record a new workspace work shift',
    showShift: 'Show Shifts',
    showShiftDesc: 'View shift history, cash drawers, and reports',
    searchShift: 'Search Shift',
    searchShiftDesc: 'Look up shifts by date, staff member, or shift code',
    shiftStaffName: 'Staff Member Name',
    shiftStartTime: 'Start Time',
    shiftEndTime: 'End Time',
    shiftCashDrawer: 'Cash Drawer Start (EGP)',
    saveShift: 'Start & Save Shift',
    openShiftTitle: 'Open Shift',
    secureTerminalInit: 'Secure terminal initialization',
    identityLabel: 'IDENTITY',
    timestampLabel: 'TIMESTAMP',
    openingCashAmount: 'Opening Cash Amount',
    startShiftBtn: 'Start Shift',
    shiftInitReady: 'Shift initialization sequence ready',
    logoutConfirmTitle: 'Active Shift Detected',
    logoutConfirmMessage: 'You have an active shift running. What would you like to do?',
    closeShiftAndLogout: 'Close Shift & Logout',
    logoutOnly: 'Logout Only',
    liveShift: 'Live Shift',
    staffLabel: 'Staff',
    durationLabel: 'Duration',
    closeShiftBtn: 'Close Shift',
    paymentChannelsTitle: 'Payment & Balance Channels',
    paymentChannelsSub: 'Cash drawer and digital wallet balances (Cash, Vodafone Cash, InstaPay, Fawry)',
    cashDrawerBadge: 'Cash Drawer',
    cashTillName: 'Cash Till',
    startingFloatPrefix: 'Starting Float: ',
    eWalletBadge: 'E-Wallet',
    vodafoneCashName: 'Vodafone Cash',
    collectedViaWallet: 'Collected via Wallet',
    instantTransferBadge: 'Instant Transfer',
    instapayName: 'InstaPay IPN',
    instantBankTransfers: 'Instant bank transfers',
    posMachineBadge: 'POS Machine',
    fawryName: 'Fawry Pay',
    posPaymentsSub: 'POS payments & terminal',
    categoryRevenuesTitle: 'Category Revenues & Expenses',
    categoryRevenuesSub: 'Sales breakdown by service area and petty cash expenses',
    workspaceCategory: 'WORKSPACE',
    workspaceCategorySub: 'Desk & area bookings',
    classroomsCategory: 'CLASSROOMS',
    classroomsCategorySub: 'Meeting & training rooms',
    packagesCategory: 'PACKAGES',
    packagesCategorySub: 'Monthly hour bundles',
    cateringCategory: 'CATERING',
    cateringCategorySub: 'Snacks & hot drinks',
    otherIncomeCategory: 'OTHER INCOME',
    otherIncomeCategorySub: 'Printing & extra services',
    pettyExpensesCategory: 'PETTY EXPENSES',
    pettyExpensesSub: 'Deducted from till',
    liveLedgerTitle: 'Live Transaction Ledger',
    recordedTransactionsCount: 'Transactions',
    timeColumn: 'TIME',
    descriptionColumn: 'DESCRIPTION',
    categoryColumn: 'CATEGORY',
    paymentChannelColumn: 'PAYMENT CHANNEL',
    amountColumn: 'AMOUNT',
    systemCategory: 'System',
    pettyCashMethod: 'Petty Cash',
    reconciliationTitle: 'End of Shift Reconciliation',
    reconciliationSubtitle: 'Balance verification across physical cash drawer and digital payment channels',
    financialSummaryTitle: 'Financial Summary',
    openingCashLabel: 'Opening Cash',
    posReceiptsLabel: 'POS Receipts',
    posBadgeText: 'POS',
    pettyCashOutLabel: 'Petty Cash Out',
    vodafoneBalanceLabel: 'Vodafone Cash',
    instapayBalanceLabel: 'InstaPay Balance',
    fawryBalanceLabel: 'Fawry Balance',
    expectedDrawerCashLabel: 'Expected Drawer Cash',
    countNoticeText: 'Count all bills and coins in the till drawer and input the total counted below.',
    declareTotalsTitle: 'Declare Counted Totals',
    actualCashLabel: 'ACTUAL DRAWER CASH',
    actualCashHint: 'Physical bills and coins counted in drawer',
    varianceStatusLabel: 'VARIANCE STATUS',
    pendingInputText: 'Pending Input...',
    pendingInputSub: 'Enter amount to calculate discrepancy',
    balancedStatusText: 'Perfectly Balanced',
    balancedStatusSub: 'Count matches system calculations',
    discrepancyText: 'Discrepancy: ',
    shortageDetected: 'Shortage detected',
    surplusDetected: 'Surplus detected',
    confirmCloseShiftBtn: 'Confirm Close Shift',
    cancelBtn: 'Cancel',
    openShiftPopupTitle: 'Start & Open New Shift',
    openShiftPopupSub: 'Declare starting cash drawer and digital wallet floats',
    openShiftEnterBtn: 'Open Shift & Enter System',
    autoAuditLogNotice: 'Automated register audit log enabled',
    startingCashField: 'Starting Cash Drawer Float',
    startingVodafoneField: 'Vodafone Cash Starting Balance',
    startingInstapayField: 'InstaPay Starting Balance',
    startingFawryField: 'Fawry POS Starting Balance',
    exportExcelBtn: 'Export Excel',
    exportPdfBtn: 'Export PDF',
    shiftHistoryTitle: 'Shift History & Audits',
    shiftHistorySubtitle: 'Review historical shift logs, drawer balances, cashier discrepancies, and reports.',
    shiftTimeColumn: 'SHIFT TIME',
    cashInColumn: 'CASH IN',
    cashOutColumn: 'CASH OUT',
    finalTotalColumn: 'FINAL TOTAL',
    varianceColumn: 'VARIANCE',
    statusColumn: 'STATUS',
    balancedStatusPill: 'Balanced',
    disputedStatusPill: 'Disputed',
    noShiftsFound: 'No recorded shifts match your search criteria or selected date.',
    showingShiftsSummary: 'Showing shifts',
    searchShiftPlaceholder: 'Search by staff, code, date...',
    allStaffOption: 'All Staff Members',
    allStatusesOption: 'All Statuses',
    balancedOption: 'Balanced (No Discrepancy)',
    disputedOption: 'Disputed (Variance)',
    applyFiltersBtn: 'Apply Filters',
    noActiveShiftTitle: 'No Active Shift',
    noActiveShiftDesc: 'There is currently no open shift. Start a new shift to begin recording reception activities and financial transactions.',
    startNewShiftBtn: '+ Start New Shift',
    activeShiftRunningNotice: 'An active shift is already running in the system.',
    goToActiveShiftBtn: 'Go to Live Shift',
    startingFloatsTitle: '1. Opening Cash Drawer & Digital Floats',
    shiftNotesTitle: '2. Shift Notes & Instructions',
    shiftNotesPlaceholder: 'Enter any handover notes or remarks for this shift...',
    totalCollectedRevenue: 'Total Inflows',
    disputedShiftsCount: 'Disputed Shifts',
    balancedShiftsCount: 'Balanced Shifts',
    viewShiftDetails: 'View Details',
    shiftDetailsTitle: 'Shift Details & Audit Breakdown',
    backToHistoryBtn: 'Back to Shift History',
    backToActiveShiftBtn: 'Back to Active Shift',
    financialLedgerSub: 'Real-time record of all revenues and expenses logged during this shift',
    resetFiltersBtn: 'Reset Filters',
    summaryCards: 'Financial & Operational Summary',
    digitalChannelsReconcile: 'Digital Channels Actual Balances',

    // 5. Bookings
    bookings: 'Bookings',
    addReservation: 'Add Reservation',
    addReservationDesc: 'Reserve a desk, room, or private zone in advance',
    showReservation: 'Show Reservations',
    showReservationDesc: 'Monitor and manage upcoming space reservations',
    reserverName: 'Client / Student Name',
    reservationDate: 'Booking Date',
    reservationTimeSlot: 'Time Slot',
    assignedSpace: 'Assigned Desk / Room',
    depositAmount: 'Deposit Paid (EGP)',
    saveReservation: 'Confirm Reservation',
    reservation: 'Reservation',
    adminConsole: 'Admin Console',
    adminConsoleDesc: 'Classroom schedule and daily reservation management',
    todaysReservations: "Today's Reservations",
    reservationDetails: 'Reservation Details',
    confirmed: 'CONFIRMED',
    upcoming: 'Upcoming',
    costBreakdown: 'Cost Breakdown',
    baseRateLabel: 'Base Rate',
    equipmentAddon: 'Equipment Add-on (DSLR Rentals)',
    earlyBirdDiscount: 'Early Bird Discount',
    studentsCount: 'students',
    cancelReservation: 'Cancel Reservation',
    classroomLabel: 'Classroom',
    idLabel: 'ID',
    costLabel: 'Cost',
    reservations: 'Reservations',
    charsLeft: 'chars left',
    digitsLeft: 'digits left',
    errorInstructor: 'Name must be 3 to 50 characters (letters only)',
    errorActivity: 'Activity must be 3 to 60 characters',
    errorPhone: 'Phone number must be exactly 11 digits',
    errorEmail: 'Please enter a valid email address',
    timeAlertCrossMidnight: 'Note: Booking ends on the next day (crosses midnight)',
    timeAlertOverlap: 'Error: There is another booking at this time for this room',
    statusActiveDropdown: 'Status: Active',
    statusAvailableDropdown: 'Status: Available',
    cateringSubtitle: 'Team Lunch',
    addCateringLabel: 'Add Catering',
    btnProcessCheckout: 'Process Payment & Free Room',
    starts: 'Starts',
    ends: 'Ends',
    cancelled: 'Cancelled',
    errorAmountReceivedLow: 'Amount received must be equal to or greater than the required amount',
    instructorPlaceholder: 'e.g. Dr. Ahmed Hassan',
    activityPlaceholder: 'e.g. Advanced Calculus, Physics Workshop',
    phonePlaceholder: 'e.g. 01012345678',
    emailPlaceholder: 'e.g. instructor@example.com',
    instructorPackage: 'Package',
    deductFromPackage: 'Deduct from Package',
    payCashDirect: 'Pay Cash',
    packageBalance: 'Package Balance',
    remainingHoursLabel: 'Remaining',
    noActivePackage: 'No active package for this instructor',
    deductedFromPackage: 'Deducted from Package',
    selectPackageOrCash: 'Payment Method',
    packageActiveBadge: 'Active Package',
    ratesAndTiming: 'Date & Schedule',

    // 6. Details
    membersInfo: 'Students & Info',
    addDiscount: 'Add Discount',
    addDiscountDesc: 'Create promotional discounts or student promo codes',
    discountCode: 'Promo Code',
    discountPercent: 'Discount Percentage (%)',
    saveDiscount: 'Save Discount Code',
    showColleges: 'Show Colleges',
    showCollegesDesc: 'Colleges and universities partnership directory',
    showBlacklist: 'Show Blacklist',
    showBlacklistDesc: 'Manage restricted or blocked users directory',
    showInstructors: 'Show Instructors',
    showInstructorsDesc: 'Registered educators, trainers, and lecturers',
    instructorName: 'Instructor Name',
    specialization: 'Specialization / Field',
    discountsAndPromoCodes: 'Discounts & Promo Codes',
    discountsPageSubtitle: 'Create promotional discounts, manage percentage rates, and track coupon usage',
    createPromoCodeBtn: '+ Create Promo Code',
    searchDiscountsPlaceholder: 'Filter by promo code, title, or scope...',
    activePromoCodes: 'Active Promo Codes',
    totalTimesUsed: 'Total Times Used',
    totalDiscountValue: 'Total Discount Value',
    titleDescription: 'Title / Description',
    discountValue: 'Discount Value',
    applicableOn: 'Applicable On',
    validityPeriod: 'Validity Period',
    usageLimitTh: 'Usage / Limit',
    copyCode: 'Copy Code',
    statusDisabled: 'Disabled',
    allServicesAndSessions: 'All Workspace Services',
    studentSessionsOnly: 'Student Sessions Only',
    instructorWorkshopsOnly: 'Instructor Workshops Only',
    hourPacksAndRooms: 'Hour Packs & Room Passes',
    createNewPromoCodeTitle: 'Create New Promo Code',
    editPromoCodeTitle: 'Edit Promo Code Details',
    autoGenerate: 'Auto Generate',
    discountType: 'Discount Type',
    percentageType: 'Percentage (%)',
    fixedAmountType: 'Fixed Amount (EGP)',
    startDate: 'Start Date',
    expirationDate: 'Expiration Date',
    saveCode: 'Save Code',
    confirmDeleteDiscountTitle: 'Confirm Promo Code Deletion',
    confirmDeleteDiscountDesc: 'Are you sure you want to permanently delete this promo code?',
    deleteCodeBtn: 'Delete Code',
    blacklistPageTitle: 'Blacklist & Restriction Directory',
    blacklistPageSubtitle: 'Manage restricted members, violation logs, and policy compliance records',
    addBlockBtn: '+ Add to Blacklist',
    searchBlacklistPlaceholder: 'Search by student name, phone number, or violation reason...',
    activeBannedCount: 'Currently Banned',
    tempRestrictionsCount: 'Temporary Restrictions',
    permanentRestrictionsCount: 'Permanent Bans',
    resolvedCasesCount: 'Resolved Records',
    memberLabel: 'Student',
    violationReason: 'Violation Reason',
    blockType: 'Restriction Type',
    blockDate: 'Date of Action',
    unblockAction: 'Unblock',
    temporary: 'Temporary',
    permanent: 'Permanent',
    bannedStatus: 'Banned',
    resolvedStatus: 'Resolved',
    addBlacklistModalTitle: 'Add to Blacklist',
    searchMemberOrEnter: 'Search student or instructor...',
    selectSeverity: 'Severity & Duration',
    tempBlock30Days: 'Temporary (30-day review)',
    permBlockFinal: 'Permanent',
    violationDetailsPlaceholder: 'Describe the incident in detail...',
    adminNotesOptional: 'Internal Admin Notes (Optional)',
    confirmBlockActionBtn: 'Confirm Action',
    confirmUnblockTitle: 'Confirm Unblock',
    confirmUnblockDesc: 'Are you sure you want to lift restrictions for this student and restore access?',
    yesUnblockBtn: 'Yes, Lift Restriction',
    noBlacklistFound: 'No restricted records found matching your search.',
    collegesPageTitle: 'Faculties & Universities Directory',
    collegesPageSubtitle: 'Manage partner universities, faculty branches, and student affiliations',
    addCollegeBtn: '+ Add Faculty / University',
    searchCollegesPlaceholder: 'Filter by faculty name, university, or campus...',
    totalColleges: 'Total Registered Faculties',
    totalAffiliatedStudents: 'Total Affiliated Students',
    topFaculty: 'Top Active Faculty',
    collegeNameLabel: 'Faculty / Major Name',
    universityLabel: 'Parent University',
    campusLocation: 'Campus / Branch Location',
    studentsCountTh: 'Students Count',
    addCollegeModalTitle: 'Add New Faculty / Specialization',
    editCollegeModalTitle: 'Edit Faculty Details',
    collegeNameAr: 'Faculty Name (Arabic)',
    collegeNameEn: 'Faculty Name (English)',
    universityAr: 'University Name',
    campusAr: 'Campus / Building Location',
    saveCollegeBtn: 'Save Faculty',
    confirmDeleteCollegeTitle: 'Confirm Faculty Deletion',
    confirmDeleteCollegeDesc: 'Are you sure you want to delete this faculty?',
    instructorsPageTitle: 'Instructors & Trainers Directory',
    instructorsPageSubtitle: 'Manage certified instructors, workshop organizers, and classroom bookings',
    addInstructorBtn: '+ Add New Instructor',
    searchInstructorsPlaceholder: 'Filter by instructor name, specialty, or affiliation...',
    totalInstructors: 'Total Instructors',
    activeInstructors: 'Active Instructors',
    totalWorkshopsGiven: 'Total Workshops Conducted',
    instructorTh: 'Instructor / Trainer',
    specialtyTh: 'Specialization / Field',
    affiliationTh: 'Affiliation / Organization',
    sessionsCountTh: 'Sessions Held',
    addInstructorModalTitle: 'Add New Instructor / Trainer',
    editInstructorModalTitle: 'Edit Instructor Details',
    instructorNameLabel: 'Instructor Full Name',
    specialtyLabel: 'Specialization & Domain',
    affiliationLabel: 'Affiliation / Institute',
    bioLabel: 'Brief Professional Bio',
    saveInstructorBtn: 'Save Instructor',
    confirmDeleteInstructorTitle: 'Confirm Instructor Deletion',
    confirmDeleteInstructorDesc: 'Are you sure you want to delete this instructor profile?',

    // 7. Catering
    catering: 'Catering',
    addProducts: 'Add Products',
    addProductsDesc: 'Add coffee, snacks, or workspace merchandise',
    showProducts: 'Show Products',
    showProductsDesc: 'Café inventory, drink items, and stock tracking',
    productGraph: 'Product Graph',
    productGraphDesc: 'Visual analytics of top-selling café items and revenue',
    productName: 'Product Name',
    productCategory: 'Category',
    productPrice: 'Price (EGP)',
    stockQuantity: 'Stock Quantity',
    saveProduct: 'Save Product',
    salesStats: 'Sales Statistics',
    done: 'Done',

    // Catering Popups, POS & Pages
    addNewProduct: 'Add New Product',
    addNewProductSubtitle: 'Add new items and drinks to the café catering inventory.',
    productDetails: 'Product Details',
    productNameEnLabel: 'Product Name (English) *',
    productNameEnPlaceholder: 'e.g. Premium Water Bottle',
    productNameArLabel: 'Product Name (Arabic)',
    productNameArPlaceholder: 'e.g. زجاجة مياه',
    categoryRequired: 'Category *',
    sellingPriceRequired: 'Selling Price (EGP) *',
    costPriceRequired: 'Cost Price (EGP) *',
    stockQtyOptional: 'Stock Quantity',
    expirationDateLabel: 'Expiration Date',
    expirationDatePlaceholder: 'e.g. Oct 15, 2026 or N/A',
    saveProductBtn: 'Save Product',
    pleaseEnterProductName: 'Please enter Product Name',
    categorySnacks: 'Snacks',
    categoryMerchandise: 'Merchandise',
    categoryBeverages: 'Beverages',
    categoryCoffee: 'Coffee',
    categoryMeals: 'Meals',
    allCategories: 'All Categories',
    productGraphHeaderTitle: 'Product Graph',
    productGraphHeaderDesc: 'Overview of point-of-sale performance and inventory movement.',
    nookCanteen: 'NOOK Canteen',
    today: 'Today',
    thisWeek: 'This Week',
    thisMonth: 'This Month',
    totalRevenue: 'Total Revenue',
    mostPopularItem: 'Most Popular Item',
    unitsSoldToday: 'units sold today',
    averageOrderValue: 'Average Order Value',
    revenueByCategory: 'Revenue by Category',
    transactions: 'Txns',
    cardPayment: 'Card',
    appPayment: 'App',
    cashPayment: 'Cash',
    topProductsByRevenue: 'Top Products by Revenue',
    viewAll: 'View All',
    thProduct: 'PRODUCT',
    thSellingPrice: 'SELLING PRICE',
    thCostPrice: 'COST PRICE',
    thStock: 'STOCK',
    thSales: 'SALES',
    thRevenue: 'REVENUE',
    thExpiration: 'EXPIRATION',
    thStatus: 'STATUS',
    thActions: 'ACTIONS',
    exportData: 'Export Data',
    exportProductsCsvTitle: 'Export Products to CSV',
    addProduct: '+ Add Product',
    searchProductPlaceholder: 'Search products by name or category...',
    statusHealthy: 'Healthy',
    statusLowStock: 'Low Stock',
    statusExpiringSoon: 'Expiring Soon',
    statusExpired: 'Expired',
    editProduct: 'Edit Product',
    confirmDeleteProduct: 'Are you sure you want to delete this product?',
    noProductsFound: 'No products found',
    showing: 'Showing ',
    to: 'to ',
    of: 'of ',
    entries: 'entries',
    prev: 'Prev',
    next: 'Next',
    editProductTitle: 'Edit Product',
    priceBelowCostWarning: 'Warning: Selling price is lower than cost price (will result in a loss)!',
    productIdentity: 'Product Identity',
    barcodeSerial: 'Barcode / Serial No.',
    pricingSection: 'Pricing & Cost',
    sellingPriceLabel: 'Selling Price',
    costPriceLabel: 'Cost Price',
    expirationDateOptional: 'Expiration Date (Optional)',
    inventorySection: 'Inventory & Stock',
    initialStock: 'Initial Stock',
    reorderLevel: 'Reorder Level',
    productImage: 'Product Image',
    uploadProductImage: 'Upload Product Image',
    productAddedSuccess: 'Product added successfully',
    productAddedDesc: 'is now available in your inventory and ready for sale.',
    inStockLabel: 'in stock',
    addAnother: 'Add Another',
    viewInventory: 'View Inventory',
    posCanteen: 'NOOK Canteen',
    currentOrder: 'Current Order',
    allItems: 'All Items',
    directCashSale: 'Direct Cash Sale',
    orderCompletedSuccess: 'Sale completed successfully!',
    emptyCartMessage: 'No items in current order. Click on products to add them.',
    clearCart: 'Clear Order',
    productNamePlaceholder: 'e.g. Nescafé Classic, Croissant',
    addNewCategoryOption: '➕ Add New Category...',
    newCategoryNamePlaceholder: 'New category name...',
    barcodeOptional: 'Barcode / Serial No. (Optional)',
    barcodeLeaveEmpty: 'Leave empty if none',
    pricingAndCost: 'Pricing & Cost',
    financialLossWarning: 'Financial Warning: Selling price is lower than cost price (will result in a loss)!',
    noExpiration: 'No Expiry (N/A)',
    noExpirationChecked: '✓ No Expiration',
    noExpirationDisplay: 'No expiration (N/A)',
    selectExpirationDate: 'Select expiration date...',
    inventoryAndStock: 'Inventory & Stock',
    boxCalculator: 'Box Calculator',
    numberOfBoxes: 'Number of Boxes',
    unitsPerBox: 'Units per Box',
    boxPlaceholder: 'e.g. 5',
    unitsPlaceholder: 'e.g. 12',
    totalCalculatedStock: 'Total Calculated Stock:',
    unitsLabel: 'units',
    reorderThreshold: 'Reorder Level (Alert Threshold)',
    productImageOptional: 'Product Image (Optional)',
    imageFileFormat: 'PNG, JPG up to 5MB',
    removeImage: 'Remove Image',
    addProductToInventory: 'Add Product to Inventory',
    cashierLabel: 'Cashier: ',
    sessionCatering: 'Session Catering',
    viewPreviousOrders: 'View previously ordered items',
    previousOrders: 'Previous Orders: ',
    itemsCount: 'items',
    itemsPreviouslyBilled: 'Items & Drinks Previously Billed to Session',
    itemsPreviouslyBilledDesc: 'Items already added to session bill and deducted from inventory',
    previousTotal: 'Previous Total:',
    hide: 'Hide',
    noDetailedItemsRecorded: 'No detailed item records found.',
    searchProductsQuick: 'Search products...',
    outOfStock: 'Out of stock',
    clickToAddToOrder: 'Click to add to order',
    inStock: 'in stock',
    noMatchingProductsInCategory: 'No matching products found in this category',
    cartEmptyTitle: 'Your cart is empty',
    cartEmptyDesc: 'Click any product from the catalog to add it to the order.',
    addToRoomSessionBtn: 'Add to Room Session & Shift',
    saleSuccessShift: 'Sale completed and credited to active shift!',
    barcodeLabel: 'Barcode',
    previousCategories: 'Previous Categories',
    nextCategories: 'Next Categories',
    addedToRoomAndShiftSuccess: 'Added to room and shift successfully!',

    // 8. Settings
    settings: 'Settings',
    addUser: 'Add User',
    addUserDesc: 'Create a new staff or admin login account',
    showUsers: 'Show Users',
    showUsersDesc: 'System administrators and staff members directory',
    userRole: 'Account Role',
    saveUser: 'Save User Account',
    systemSettingsTitle: 'System Settings & Workspace Setup',
    systemSettingsSubtitle: 'Manage student hourly pricing tiers, room entities, and quick package templates',
    addPricingTierBtn: '+ Add Pricing Tier',
    addRoomSpaceBtn: '+ Add Room / Space',
    addPackagePresetBtn: '+ Add Package Preset',
    studentHourlyPricingTab: 'Student Hourly Pricing',
    classroomsZonesTab: 'Classrooms & Zones',
    quickPackagePresetsTab: 'Quick Package Presets',
    packageTargetLabel: 'Package Audience / Target',
    studentPackagesFilter: 'Student Packages',
    instructorPackagesFilter: 'Instructor Packages',
    allPackagesFilter: 'All Packages',
    studentPackageTypeOption: 'Student (Workspace)',
    instructorPackageTypeOption: 'Instructor (Classroom)',
    packageAudienceHeader: 'Target Audience',
    studentBadgeText: 'Student',
    instructorBadgeText: 'Instructor',
    fromHoursHeader: 'From (Hours)',
    toHoursHeader: 'To (Hours)',
    duePriceHeader: 'Due Price',
    tierDescriptionHeader: 'Tier Description',
    noPricingTiersAdded: 'No pricing tiers added',
    noPackagePresetsAdded: 'No package presets added',
    roomCapacityCap: 'Cap',
    egpPerHourShort: 'EGP/hr',
    defaultValidity: 'Default Validity',
    addNewTierModalTitle: 'Add New Pricing Tier',
    editTierModalTitle: 'Edit Pricing Tier',
    fromHoursLabel: 'From Hours',
    toHoursLabel: 'To Hours',
    priceDueLabel: 'Price (EGP)',
    arabicLabelDesc: 'Arabic Label',
    saveTierBtn: 'Save Tier',
    addNewRoomModalTitle: 'Add Room / Space',
    editRoomModalTitle: 'Edit Room',
    spaceTypeLabel: 'Space Type',
    capacityStudentsLabel: 'Capacity (Max Students)',
    roomImageUrlLabel: 'Room Image URL',
    roomImageUploadLabel: 'Room Image',
    clickToUploadRoomImage: 'Click to upload room image from your device',
    roomImageFileFormatHint: 'Supports PNG, JPG, JPEG, WEBP (Max 5MB)',
    saveRoomBtn: 'Save Room',
    addNewPackagePresetModalTitle: 'Add Package Preset',
    editPackagePresetModalTitle: 'Edit Package Preset',
    packageHoursLabel: 'Package Hours',
    customValidityDaysLabel: 'Custom Validity (Days)',
    customOptionLabel: 'Custom',
    customDaysPlaceholder: 'e.g. 45, 90, 120...',
    quickPresetHoursLabel: 'Quick Hour Presets',
    savePackagePresetBtn: 'Save Preset',
    systemUsersRolesTitle: 'System Users & Roles',
    systemUsersRolesSubtitle: 'Manage user accounts, system access permissions, and active statuses',
    searchUsersPlaceholder: 'Search by name, username, email, phone, role...',
    addNewUserBtn: '+ Add User',
    totalUsersKpi: 'Total Users',
    adminsSupervisorsKpi: 'Admins & Managers',
    receptionCashiersKpi: 'Receptionists',
    userAccountTh: 'User Account',
    rolePermissionTh: 'Role / Permission',
    accountStatusTh: 'Account Status',
    createdDateTh: 'Created Date',
    adminManagerRole: 'Admin / Manager',
    supervisorRole: 'Supervisor',
    receptionCashierRole: 'Receptionist',
    memberRole: 'Member',
    statusActiveText: 'Active',
    statusDisabledText: 'Disabled',
    noUsersFoundTitle: 'No Users Found',
    noUsersFoundSubtitle: 'No user accounts match your search query',
    showingUsersSummary: 'Showing user accounts',
    addNewUserModalTitle: 'Add New User Account',
    editUserModalTitle: 'Edit User Account',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    resetPasswordOptional: 'Reset Password (Optional)',
    rolePermissionLabel: 'Role / Permission',
    classroomOption: 'Classroom',
    silentZoneOption: 'Silent Zone',
    sharedSpaceOption: 'Shared Space',
    tierLabelPlaceholder: 'e.g. 1-3 Hours',
    packagePresetPlaceholder: 'e.g. 20 Hours Pass',
    validFromHoursRequired: 'Valid From Hours is required',
    toHoursGreaterThanFrom: 'To Hours must be greater than From Hours',
    validPriceRequired: 'Valid price is required',
    roomNameRequired: 'Room name is required',
    packageHoursRequired: 'Package hours is required',

    // Dashboard Overview
    welcome: 'Welcome, System Admin',
    welcomeBack: 'Welcome back,',
    dashboardSubtitle: 'Monitoring and analytics dashboard for managing NOOK Workspace spaces and bookings',
    viewBookings: 'View Bookings',
    activeBookings: 'Active bookings',
    availableDesks: 'Available desks',
    activeMembers: 'Active members',
    occupancyRate: 'Occupancy rate',
    thisMonthTrend: '▲ 12% this month',
    readyToBook: 'Ready to book',
    activeNow: 'Active now',
    goodPerformance: 'Good performance',
    bookingsByDay: 'Bookings by day',
    spaceDistribution: 'Space distribution',
    privateDesks: 'Private desks',
    sharedSpaces: 'Shared',
    meetingRooms: 'Meeting rooms',
    contentArea: 'Content area',
    contentDesc1: 'Build page content here — tables, charts.',
    contentDesc2: 'This section is ready for the team to fill.',
    createAndManageDiscounts: 'Create & manage promotional discounts',
    fastCheckInDesc: 'Fast check-in for workspace session',
    quickCheckIn: 'Quick Check-in',
    configureNewRoomDesc: 'Configure new workshop or room',
    setupRoom: 'Setup Room',
    shiftHandoverDesc: 'Shift handover & cash settlement',
    activityOccupancyFlow: 'Activity & Occupancy Flow',
    peakToday: 'Peak Today',
    todayHourly: 'Today (Hourly)',
    weekly: 'Weekly',
    peakTime: 'Peak Time',
    avgSession: 'Avg Session',
    totalFootfall: 'Total Footfall',
    currentActiveStudents: 'Current Active Students in Space',
    deskSpace: 'DESK / SPACE',
    todaysRoomBookings: 'Today\'s Room & Workshop Bookings',
    viewSchedule: 'View Schedule',
    inProgress: 'In Progress',
    seatsLabel: 'seats',

    // 9. Packages (Student & Instructor)
    details: 'Details',
    packagesTitle: 'Packages & Subscriptions',
    studentPackagesTitle: 'Student Packages',
    studentPackagesSubtitle: 'Manage student pre-paid hour packages, track usage consumption, and renew passes',
    instructorPackagesTitle: 'Instructor Packages',
    instructorPackagesSubtitle: 'Manage classroom pre-paid packs, track workshop consumption, and training hours',
    sellStudentPackage: 'Sell Student Package',
    sellInstructorPackage: 'Sell Instructor Package',
    sellStudentPackageTitle: 'Sell & Activate Student Package',
    sellStudentPackageSubtitle: 'Allocate study hours quota, assign student accounts, and process invoice',
    sellInstructorPackageTitle: 'Sell & Activate Instructor Package',
    sellInstructorPackageSubtitle: 'Allocate classroom hours quota, assign instructor accounts, and process invoice',
    activeStudentPasses: 'Active Student Passes',
    activeInstructorPacks: 'Active Instructor Packs',
    totalRemainingBalance: 'Total Remaining Balance',
    expiringSoonLow: 'Expiring Soon / Low',
    studentPackagesValue: 'Student Packages Value',
    instructorPackagesValue: 'Corporate Packages Value',
    allPackages: 'All Packages',
    activePasses: 'Active Passes',
    exhaustedPasses: 'Exhausted',
    expiredPasses: 'Expired',
    nearExpiryPasses: 'Near Expiry / Low',
    statusActivePass: 'Active',
    statusNearExpiryPass: 'Near Expiry',
    statusExhaustedPass: 'Exhausted',
    statusExpiredPass: 'Expired',
    searchStudentPackagePlaceholder: 'Search by student, package name, or phone...',
    searchInstructorPackagePlaceholder: 'Search by instructor or package name...',
    studentOrMembers: 'Students',
    instructorOrEntity: 'Instructor / Entity',
    allocatedHours: 'Granted Hours',
    usedHours: 'Used Hours',
    remainingHours: 'Remaining Hours',
    costCost: 'Value',
    expiryDate: 'Expiry Date',
    noStudentPackagesFound: 'No student packages found matching your criteria.',
    noInstructorPackagesFound: 'No instructor packages found matching your criteria.',
    groupStudentsCount: 'students',
    showingPackagesSummary: 'packages',
    viewDetailsAndHistory: 'View Details & Usage History',
    deletePackageAction: 'Delete Package',
    memberDataSection: 'Student Selection',
    instructorDataSection: 'Instructor Member Selection',
    searchMemberLabel: 'Search Student by Name or Phone',
    searchInstructorLabel: 'Search Instructor by Name or Phone',
    searchMemberInputPlaceholder: 'Search student name or phone to add...',
    searchInstructorInputPlaceholder: 'Search instructor name or phone to add...',
    addMemberBadge: 'Add',
    dateAndValiditySection: 'Activation & Validity',
    packageStartDate: 'Start Date',
    packageExpiryDate: 'Expiry Date',
    packageNotesPlaceholder: 'Optional internal notes or conditions...',
    selectHoursPackage: 'Select Package',
    customPackageHours: 'Custom Hours',
    customPackageRate: 'Hourly Rate (EGP)',
    packageSummaryAndPayment: 'Package Summary & Payment',
    selectedPackageLabel: 'Package',
    studentsCountLabel: 'Student Count',
    instructorsCountLabel: 'Instructor Count',
    hoursQuota: 'Hours Quota',
    effectiveRatePerHour: 'Rate per Hour',
    totalDueRequired: 'Total Due',
    hideDiscount: 'Hide Discount',
    addDiscountCoupon: '+ Add Discount Code',
    enterCouponCodePlaceholder: 'Coupon (e.g. STUDENT10)...',
    paymentMethodLabel: 'PAYMENT METHOD',
    vodafonePayment: 'Vodafone Cash',
    instapayPayment: 'InstaPay',
    fawryPayment: 'Fawry',
    amountReceivedLabel: 'AMOUNT RECEIVED',
    amountReceivedPlaceholder: '0.00 EGP',
    cashShortAlert: 'Amount received is less than total due',
    changeDueCustomer: 'Change Due',
    confirmAndCompleteSale: 'Confirm & Complete Sale',
    packageValidityDays: 'days',
    optionsCount: 'Options',
    egpPerHour: 'EGP/h',
    studentPassTag: 'Student Pass',
    instructorPassTag: 'Instructor Pack',
    enrolledGroupMembers: 'Enrolled Group Members',
    remainingBalanceRate: 'Remaining Balance',
    consumedLabel: 'Consumed',
    remainingLabel: 'Remaining',
    totalLabel: 'Total',
    costPaid: 'Cost Paid',
    purchasedDate: 'Purchased',
    expiryAndNotesSettings: 'Expiry Date & Notes',
    unlockEdit: 'Unlock & Edit',
    lockEdit: 'Lock',
    savePackageModifications: 'Save Changes',
    usageSessionsLog: 'Usage Sessions Log',
    registeredSessionsCount: 'sessions',
    deductHoursBtn: 'Deduct Hours',
    noUsageSessionsYet: 'No session hours deducted from this package yet.',
    closeBtn: 'Close',
    deductSessionTitle: 'Deduct Package Hours',
    deductSessionSubtitle: 'Subtract consumed session hours from package balance',
    sessionTitleLabel: 'Session Title',
    hoursToDeductLabel: 'Hours to Deduct',
    deskLocationLabel: 'Desk / Location',
    confirmDeductionBtn: 'Confirm Deduction',
    confirmDeleteStudentPackageTitle: 'Confirm Package Deletion',
    confirmDeleteInstructorPackageTitle: 'Confirm Package Deletion',
    confirmDeleteStudentPackageDesc: 'Are you sure you want to permanently delete this student package?',
    confirmDeleteInstructorPackageDesc: 'Are you sure you want to permanently delete this instructor package?',
    adminPasswordConfirmation: 'Admin Password Confirmation',
    adminPasswordPlaceholder: 'Enter admin password (e.g. 1234)',
    yesDeletePackage: 'Delete Package',
    // Roles & Permissions Matrix
    rolesAndPermissionsTab: 'Roles & Permissions',
    rolesMatrixTitle: 'System Roles & Permissions Matrix',
    rolesMatrixSubtitle: 'Access control rights and module permissions by user role in NOOK Workspace',
    adminRoleBadge: 'Admin',
    adminRoleDesc: 'Full comprehensive control over all modules, system settings, pricing, and accounts',
    supervisorRoleBadge: 'Supervisor',
    supervisorRoleDesc: 'Manages operations, financial reports, discounts, and shifts',
    receptionistRoleBadge: 'Receptionist',
    receptionistRoleDesc: 'Manages daily operations, check-in/out, bookings, canteen POS, shifts, packages, discounts, and financial reports',
    memberRoleBadge: 'Member',
    memberRoleDesc: 'Customer role',
    moduleAndFeatureColumn: 'Module / Feature',

    // Shift & Cash Ledger
    adminFundLabel: 'Admin Fund:',
    insideFlow: 'In',
    outsideFlow: 'Out',
    insideFlowFull: 'Inside',
    outsideFlowFull: 'Outside',
    searchTransactionsPlaceholder: 'Search transactions...',
    allPaymentChannels: 'All Payment Channels',
    twoShiftsRunningWarning: 'Two shifts cannot be open simultaneously. The active shift must be closed first.',
    printShiftSummaryBtn: 'Print Shift Summary',
    closingNotesLabel: 'Closing Notes:',

    // Packages Management
    editPackageTitle: 'Edit Package Details',
    editInstructorPackageTitle: 'Edit Instructor Package Details',
    totalHoursLabel: 'Total Hours',
    totalCostLabel: 'Total Cost (EGP)',
    expiryDateLabel: 'Expiry Date',
    notesLabel: 'Notes',

    // Classroom Reservations
    newReservation: 'New Reservation',
    newReservationTitle: 'New Reservation',
    duplicateReservationBtn: 'Duplicate',
    duplicateReservationTitle: 'Duplicate Reservation',
    editReservationTitle: 'Edit Reservation',
    splitReservationBtn: 'Split',
    splitReservationTitle: 'Split / Cut Reservation',
    splitIntervalDesc: 'Specify the sub-range time interval to cut out / remove from reservation:',
    cutStartTime: 'Cut Start Time',
    cutEndTime: 'Cut End Time',
    splitNote: 'The reservation will be split into two records (before and after the cut), recalculating costs and hours automatically.',
    confirmSplitBtn: 'Confirm Split',
    deleteReservationBtn: 'Delete',
    copySuffix: ' (Copy)',

    // Catering Products
    savingProduct: 'Saving Product...',
    addingProduct: 'Adding Product...',
    productExpiredTooltip: 'Product is expired - not available for sale',
    expiredStatus: 'Expired',

    // Workspace & Checkout
    printingLabel: 'Printing',
    printingPagesRate: 'pages (1.50 EGP/page)',
    premiumWiFi: 'Premium WiFi',
    paidDeposit: 'Paid Deposit',
    discountReduction: 'Discount / Reduction',
    studentPackageMethod: 'Student Package',
    partialPaymentDue: 'Partial Payment (Outstanding Due)',
    applyDiscountTitle: 'Apply Discount',
    discountTypeLabel: 'Discount Type',
    percentageOption: 'Percentage (%)',
    fixedAmountOption: 'Fixed Amount (EGP)',
    percentageValueLabel: 'Percentage Value (%)',
    discountAmountLabel: 'Discount Amount (EGP)',
    exportDisplayedResults: 'Export Displayed Results',
    exportDisplayedToCSV: 'Export Displayed Results to CSV',
    deleteSession: 'Delete Session',
    showingLabel: 'Showing',
    toLabel: 'to',
    ofLabel: 'of',
    activeStudentsCountLabel: 'active students',
    historyStudentsCountLabel: 'past sessions',
    perPageLabel: 'Per page:',
    workshopSession: 'Workshop Session',
    sharedSpace: 'Shared Space',
    duringSession: 'During session',
    baseSessionCost: 'Workspace Base Cost',
    drinksAndSnacksSub: 'Snacks & Drinks',
    addCateringItemBtn: 'ADD ITEM',
    printingHandoutsSub: 'Handouts',
    processPaymentAndFree: 'Process Payment & Free Room',
    studentNameRequired: 'Student name is required',
    phoneNumberRequired: 'Phone number is required',
    noDataToExport: 'No matching filtered data to export',
    resultsExportedSuccess: 'Displayed results exported successfully!',
    invalidCouponCode: 'Invalid coupon code',

    // Details & Settings Messages
    threeWordsNameRequired: 'Please enter the full three-part name (at least three words)',
    validEmailFormatRequired: 'Please enter a valid email address (e.g. name@example.com)',
    promoCodeRequired: 'Promo code is required',
    discountTitleRequired: 'Discount title is required',
    expiryDateRequired: 'Expiry date is required',
    expiryDateCannotBePast: 'Expiry date cannot be earlier than today',
    collegeNameRequired: 'College/Faculty name is required',
    universityNameRequired: 'University name is required',
    memberNameRequired: 'Member name is required',
    blockReasonRequired: 'Reason for block is required',
    namePlaceholderExample: 'e.g. Ahmed Mahmoud',
    usernamePlaceholderExample: 'e.g. ahmed_admin',
    editStudentTitle: 'Edit Student',
    editStudentSubtitle: 'Edit student basic details, session schedule and room',
    existingStudentDetected: 'Existing Student Detected',
    quickStudentSearch: 'STUDENT SEARCH',
    quickStudentSearchPlaceholder: 'Search by student name or phone...',
    activePackageBadge: 'Active Package',
    standardSessionBadge: 'Standard',
    dateTimeSection: 'Date & Time',
    startTimeLabel: 'Start Time',
    openTimeBadge: 'OPEN',
    openSessionToggle: 'OPEN',
    nowBtn: 'Now',
    invalidTimeRangeNotice: 'Invalid time range: End time must be after start time',
    paymentMethodAndPackage: 'Payment Method',
    deductFromHoursPackage: 'Deduct from Package',
    noActivePackageForStudent: 'No active package for this student',
    selectRoomArea: 'SELECT ROOM AREA',
    sharedSpaceRooms: 'Shared Space',
    silentZoneRooms: 'Silent Zone',
    extraServicesAndAmenities: 'Extra Services & Amenities',
    printingPagesLabel: 'PRINTING (PAGES)',
    packageAndServicesDetails: 'Package & Services',
    digitalChannelsActualBalances: 'Digital Channels Actual Balances',
    cutSubRangeInvalid: 'Cut sub-range must fall strictly within the reservation start and end times.',
    confirmDeleteBookingPrompt: 'Are you sure you want to delete this reservation?',
    adminAccountProtected: 'Admin account is permanently active',
    cannotDeleteOwnAccount: 'Cannot delete your own active account',
    cannotDeleteLastAdmin: 'Cannot delete the last active Admin',
    noTransactionsForChannel: 'No transactions found for the selected payment method',
    requiredText: 'Required',
    totalOpeningFloatBalance: 'Total Opening Float Balance:',
    frontDeskStaff: 'Front Desk Staff',
    clickToViewShiftDetails: 'Click to view shift details',
    studentsUnit: 'students',
    estimatedCollegeCapacity: 'Estimated College Capacity',
    derivedFromRegisteredColleges: 'Derived from registered colleges',
    discountOffBadge: 'OFF',
    general: 'General',
    bookingSummaryHeading: 'Booking Summary',
    selectedRoomLabel: 'Selected Room',
    egpPerHourRate: 'EGP/hr',
    planTypeLabel: 'Plan Type',
    packageDeductionLabel: 'Package Deduction',
    estimatedDurationLabel: 'Estimated Duration',
    openEndedSessionLabel: 'Open-ended Session',
    hoursUnit: 'hours',
    printingFeeLabel: 'Printing',
    pagesUnit: 'pages',
    walletDepositLabel: 'Wallet Deposit',
    amMarker: 'AM',
    pmMarker: 'PM',
    egpPerPage: 'EGP/page',
    wifiVoucherPlaceholder: 'e.g. NOOK-WIFI-99',
    freshOrangeJuicePlaceholder: 'e.g. Fresh Orange Juice',
    hrsBadge: 'hrs'
  },
  ar: {
    search: 'سيرش على أي حاجة...',
    signOut: 'لوج أوت',
    admin: 'أدمن',
    systemAdmin: 'سوبر أدمن',
    save: 'سيف',
    cancel: 'كنسل',
    edit: 'إيديت',
    delete: 'امسح',
    filter: 'فلترة',
    export: 'طلّع شيت CSV',
    actions: 'أكشنز',
    status: 'الستاتس والحالة',
    active: 'شغال وأكتيف',
    inactive: 'مش شغال / مقفول',
    all: 'كله',
    view: 'بص عليه',
    phone: 'رقم الموبايل',
    email: 'الإيميل',
    fullName: 'الاسم كامل',
    date: 'التاريخ',
    time: 'الساعة كام',
    price: 'السعر (ج.م)',
    notes: 'نوتس وملاحظات',
    noData: 'مفيش أي داتا متسجلة هنا خالص.',
    submit: 'أكد وتمام',
    loading: 'ثانية واحدة بنحمّل...',
    currency: 'ج.م',
    main: 'الهوم',
    dashboard: 'الداشبورد',
    management: 'الإدارة والتحكم',
    other: 'حاجات تانية',

    // 1. Workspace
    workspace: 'الورك سبيس',
    addStudent: 'ضيف ستيودنت جديد',
    addStudentDesc: 'سجل ستيودنت جديد عندك في سيستم الورك سبيس',
    checkInStudent: 'تشيك إن لستيودنت',
    checkInStudentDesc: 'دخل بيانات الستيودنت وتفاصيل السيشن بتاعته.',
    studentInformation: '1. بيانات الستيودنت',
    sessionAndBilling: '2. السيشن والحساب',
    studentName: 'اسم الستيودنت',
    whatsapp: 'رقم الواتساب',
    sameAsPhone: 'هو هو نفس رقم الموبايل',
    faculty: 'الكلية أو التخصص',
    printing: 'برنت ورق (عدد الورق)',
    wifi: 'الواي فاي',
    wifiVoucher: 'فاوتشر / كود الواي فاي',
    extraServices: '3. سيرفيسز وحركات إضافية',
    pickSpecificDate: 'نقّي تاريخ معين:',
    noStudentsFound: 'ملقناش أي ستيودنت بالبحث أو التاريخ ده.',
    wallet: 'الواليت (ج.م)',
    egp: 'ج.م',
    papers: 'ورقة',
    blacklistAlert: 'خد بالك: الستيودنت ده محطوط في البلاك ليست عشان عامل دوشة قبل كده!',
    checkIn: 'وقت التشيك إن',
    expectedCheckout: 'هيعمل تشيك أوت إمتى؟',
    newSession: 'سيشن جديدة',
    standardHourlyRate: 'سعر الساعة العادي',
    usePackage: 'خصم من الباكيدج',
    deductFromHours: 'اخصم من ساعات الباكيدج بتاعته',
    coupon: 'بروموكود ديسكاونت',
    applyDiscountCode: 'طبّق كود الخصم',
    selectPackageCoupon: 'اختار الكوبون أو الباكيدج',
    sessionPrice: 'سعر السيشن (ج.م)',
    sessionPricePlaceholder: 'مثلاً: 40',
    selectPackage: 'اختار الباكيدج المشترك فيها',
    couponCode: 'كود البروموكود',
    enterCouponPlaceholder: 'اكتب كود البروموكود هنا',
    confirmCheckIn: 'يلا تشيك إن',
    showStudents: 'الستيودنتس اللي منورنا',
    showStudentsDesc: 'دليل وقايمة الستيودنتس المسجلين واشتراكاتهم',
    activeStudentsTitle: 'الستيودنتس اللي موجودين',
    activeStudentsSubtitle: 'قايمة بالناس اللي قاعدة في الورك سبيس دلوقتي',
    allStudentsDirectory: 'دليل جميع الستيودنتس',
    registerNewStudentBtn: 'تسجيل ستيودنت جديد',
    contactInfo: 'بيانات التواصل',
    collegeAndFaculty: 'الكلية والجامعة',
    packageAndPlan: 'الباكيدج والاشتراك',
    visitsAndActivity: 'الزيارات والنشاط',
    statusOffline: 'غير متواجد',
    totalRegisteredStudents: 'إجمالي الستيودنتس المسجلين',
    packageSubscribers: 'مشتركي الباكيدجات',
    registerStudentTitle: 'تسجيل ستيودنت جديد في الدليل',
    registerStudentSubtitle: 'إضافة بيانات الستيودنت لقاعدة البيانات والدليل العام',
    insideRightNow: 'مين منورنا دلوقتي؟',
    avgSessionTitle: 'متوسط وقت القعدة (السيشن)',
    todayCheckinsTitle: 'تشيك إن النهارده',
    checkoutsTodayTitle: 'تشيك أوت النهارده',
    workspaceHistory: 'هيستوري الورك سبيس',
    cateringColumn: 'الكافيه والمشروبات',
    actionsColumn: 'الأكشنز',
    costColumn: 'التكلفة (ج.م)',
    checkedOutStatus: 'عمل تشيك أوت وخلّص',
    statusActive: 'قاعد جوه',
    statusLeft: 'مشي خلاص',
    statusBlocked: 'متبلك في البلاك ليست',
    blockStudentBtn: 'بلك الستيودنت',
    blockConfirmTitle: 'هتبلك الستيودنت ده وتنزله بلاك ليست؟',
    blockReasonLabel: 'متبلك ليه؟ (السبب)',
    blockReasonPlaceholder: 'اكتب السبب هنا (مثلاً: عامل دوشة متكررة، مدفعش الحساب، كسر القواعد...)',
    confirmBlockBtn: 'بلكه ووديه البلاك ليست',
    unblockBtn: 'فك البلوك عنه',
    blockedDate: 'تاريخ التبليك',
    reason: 'السبب',
    filterText: 'فلترة',
    addBtn: 'ضيف',
    checkOutBtn: 'تشيك أوت',
    newStudentCheckInBtn: 'تشيك إن لستيودنت جديد',
    searchStudentOrFaculty: 'دور باسم الستيودنت أو الكلية...',
    allDates: 'كل التواريخ',
    todayText: 'النهارده',
    yesterdayText: 'إمبارح',
    thisWeekText: 'الأسبوع ده',
    showingText: 'عرض',
    toText: 'لحد',
    ofText: 'من أصل',
    resultsText: 'ستيودنت قاعدين',
    editStudent: 'عدل بيانات الستيودنت',
    confirmDeleteTitle: 'متأكد إنك عايز تمسح سيشن الستيودنت ده؟',
    confirmDeleteDesc: 'لو مسحتها مش هتعرف ترجعها تاني، متأكد من القرار ده؟',
    saveChanges: 'سيف التعديلات',
    editText: 'إيديت',
    deleteText: 'امسح',
    userInformation: 'بيانات الكلاينت',
    emailLabel: 'الإيميل',
    sessionDetails: 'ديتيلز السيشن والوقت',
    lineItems: 'تفاصيل الحساب والبنود',
    billingDetails: 'بنود الفاتورة والحساب',
    workspaceBaseCost: 'تكلفة قعدة الورك سبيس',
    facultyDiscount: 'ديسكاونت الكلية',
    addDiscountBtn: '+ ضيف ديسكاونت',
    applyBtn: 'طبّق البروموكود',
    subtotalText: 'التوتال قبل الديسكاونت',
    discountsApplied: 'إجمالي الديسكاونت',
    finalAmountText: 'المطلوب يتدفع',
    paymentMethodText: 'هيدفع إزاي؟',
    cashText: 'كاش',
    vodafoneCashText: 'فودافون كاش',
    fawryText: 'فوري',
    instaPayText: 'إنستاباي',
    amountReceivedText: 'استلمت منه كام كاش في إيدك؟',
    changeToReturnText: 'الفكة اللي هترجعهاله',
    finalizeAndCloseBtn: 'حاسب وقفل السيشن واعمل تشيك أوت',
    addItemBtn: '+ زوّد أوردر / طلب',
    ratePerHour: 'ج.م / ساعة',
    checkout: 'التشيك أوت والفاتورة',
    checkoutDesc: 'احسب الساعات واطبع الفاتورة واعمله تشيك أوت',
    college: 'الجامعة',
    planType: 'نوع الباكيدج',
    balance: 'الرصيد في الواليت (ج.م)',
    saveStudent: 'سيف بيانات الستيودنت',
    studentId: 'كود الستيودنت',
    joinedDate: 'تاريخ أول ما جالنا',
    totalStudents: 'إجمالي الستيودنتس',
    searchStudents: 'دور بالاسم، رقم الموبايل أو الجامعة...',
    checkinTime: 'وقت ما دخل (تشيك إن)',
    checkoutTime: 'وقت ما خرج (تشيك أوت)',
    duration: 'قعد قد إيه بالظبط',
    totalDue: 'الحساب المطلوب (ج.م)',
    processCheckout: 'قفل الحساب واعمل تشيك أوت',

    // 2. Classroom
    classrooms: 'الكلاس رومات',
    addClassroom: 'ضيف روم جديدة',
    addClassroomDesc: 'ضيف كلاس روم أو مساحة ورش عمل جديدة عندك',
    showClassrooms: 'عرض الرومات',
    showClassroomsDesc: 'شوف الرومات وسعتها ومين حاجز ومين فاضي',
    classroomCheckout: 'تشيك أوت للروم',
    classroomCheckoutDesc: 'قفل حجز الروم وحاسب الإنستراكتور واعمل تشيك أوت',
    roomName: 'اسم الروم',
    capacity: 'سعة الكراسي (كام كرسي)',
    hourlyRate: 'سعر الساعة (ج.م)',
    featuresEquipment: 'التجهيزات والمعدات المتاحة جوه الروم',
    saveClassroom: 'سيف الروم',
    availableRooms: 'الرومات الفاضية دلوقتي',
    bookedRooms: 'الرومات المحجوزة',
    classroomLiveBoard: 'لايف بورد الرومات',
    classroomLiveBoardDesc: 'الحالة اللحظية للرومات والكلاسات كلها دلوقتي.',
    newClassroomBooking: 'حجز روم جديدة',
    newClassroomBookingDesc: 'ظبط ديتيلز السيشن والمطلوب فيها.',
    configureBookingDetails: 'ظبط ديتيلز الحجز والمعدات المطلوبة.',
    searchClassrooms: 'دور على رومات، إنستراكتورز...',
    statusAll: 'الحالة: كله',
    statusScheduled: 'محجوزة',
    statusAvailable: 'فاضية وجاهزة',
    statusCompleted: 'خلصت خلاص',
    dateToday: 'التاريخ: النهارده',
    dateThisWeek: 'التاريخ: الأسبوع ده',
    instructor: 'الإنستراكتور',
    startedAt: 'بدأت',
    elapsed: 'عدى منها',
    rental: 'إيجار الروم',
    addCatering: 'طلب كافيه وسناكس',
    bookRoom: 'حجز الروم',
    roomEmptyTitle: 'دي الروم فارغة دلوقتي وجاهزة للحجز.',
    coreDetails: 'البيانات الأساسية',
    activitySubject: 'النشاط / موضوع الورشة',
    phoneNumber: 'رقم الموبايل',
    emailAddress: 'الإيميل',
    ratesAndAddons: 'الأسعار والإضافات',
    hourlyRateLabel: 'سعر الساعة (ج.م)',
    printingChargesLabel: 'رسوم الطباعة (ج.م)',
    bookingDate: 'تاريخ الحجز',
    startTime: 'هتبدأ الساعة كام',
    endTime: 'هتخلص الساعة كام',
    now: 'دلوقتي',
    invalidTimeRange: 'يجب أن يكون وقت الانتهاء بعد وقت البدء',
    logistics: 'اللوجستيات والمكان',
    room: 'الروم',
    availabilityConfirmed: 'تم تأكيد التوفر',
    bookingSummary: 'ملخص الحجز',
    roomRental: 'إيجار الروم',
    printingCharges: 'رسوم الطباعة',
    subtotal: 'المجموع الفرعي',
    discount: 'ديسكاونت',
    discountTenPercent: 'ديسكاونت 10%',
    discountApplied: 'الديسكاونت المطبق',
    total: 'الإجمالي',
    confirmBooking: 'أكد الحجز يلا',
    finalizingSessionFor: 'إنهاء السيشن لـ',
    activity: 'النشاط',
    timing: 'التوقيت',
    financialBreakdown: 'التفاصيل المالية',
    perHour: '/ساعة',
    hrs: 'ساعات',
    teamLunch: 'وجبة جماعية',
    handouts: 'مطبوعات ورقية',
    manualAdjustment: 'تسوية يدوية',
    loyaltyDiscount: 'ديسكاونت الولاء',
    specialMemberRate: 'ديسكاونت خاص',
    finalAmount: 'المبلغ النهائي',
    payment: 'الدفع',
    paymentMethod: 'طريقة الدفع',
    cash: 'نقدي (كاش)',
    vodafoneCash: 'فودافون كاش',
    fawry: 'فوري',
    instaPay: 'إنستاباي',
    amountReceived: 'المبلغ المستلم',
    changeDue: 'المتبقي للعميل (الباقي)',
    processPaymentAndFreeRoom: 'إتمام الدفع وتحرير الروم',
    canteenAndDrinks: 'الكانتين والمشروبات',
    addCanteenOrders: 'ضيف طلبات من الكانتين / الكافيه',
    selectItemsOrCustom: 'حدد المشروبات والمأكولات أو أدخل مبلغاً مخصصاً',
    orEnterCustomAmount: 'أو أدخل مبلغاً يدوياً مخصصاً (ج.م)',
    applyAmount: 'طبّق المبلغ',
    cateringTotal: 'إجمالي الكافيه:',
    confirmAndDone: 'تأكيد وإغلاق',
    printingAndPhotocopy: 'الطباعة وتصوير الورق',
    calcPrintingCharges: 'حساب رسوم الطباعة وتصوير الورق',
    calcByPagesOrCustom: 'أدخل عدد الورق أو حدد المبلغ الإجمالي للطباعة',
    numberOfPages: 'عدد الورق المصور',
    pricePerPage: 'سعر الورقة (ج.م)',
    printingTotal: 'إجمالي الطباعة:',
    applyAndSave: 'طبّق وسيف',
    editRateAndDuration: 'إيديت سعر الساعة ومدة الحجز',
    adjustRateAndHours: 'إيديت قيمة إيجار الساعة وعدد الساعات الفعلية',
    hourlyRateEgp: 'سعر الساعة (ج.م / ساعة)',
    durationHoursLabel: 'عدد الساعات المحسوبة',
    rentalTotal: 'إجمالي الإيجار:',
    applyDiscountOrAdjustment: 'طبّق ديسكاونت أو تسوية يدوية',
    addDiscountOrAdjustment: 'ضيف ديسكاونت أو تسوية',
    directDiscountAmountPlaceholder: 'مبلغ الديسكاونت المباشر (ج.م)',
    promoCode: 'كود البروموكود',
    applyPromoCode: 'طبّق البروموكود',
    enterPromoCodePlaceholder: 'أدخل كود البروموكود',
    pleaseEnterCoupon: 'لازم تكتب كود البروموكود',
    invalidCoupon: 'كود البروموكود ده مش شغال أو غلط',
    overtimeAlertTitle: 'تنبيه تجاوز الوقت واحتساب ساعة جديدة:',
    gracePeriodNotice: 'ضمن فترة السماح 10 دقائق — مفيش رسوم إضافية',
    extraHourChargedNotice: 'تجاوز فترة السماح 10 دقائق — تم احتساب ساعة إضافية',
    minutesRemaining: 'دقيقة متبقية على انتهاء الوقت',
    timeEndedGrace: 'انتهى الوقت (فترة سماح: مضى {mins} من 10 د)',
    overdueByMins: 'تجاوز الوقت بـ {mins} دقيقة (+{hours} ساعة إضافية)',
    editHourlyRateTooltip: 'إيديت سعر الساعة',
    removeDiscountTooltip: 'كنسل الديسكاونت',
    removeAdjustmentTooltip: 'كنسل التسوية',
    emptyStateNoClassrooms: 'مفيش رومات مطابقة لخيارات السيرش.',
    fullHallRental: 'إيجار الروم بالكامل (حجز خاص)',
    fullHallRentalDesc: 'حجز شامل لكامل الروم وسعتها للمجموعة',
    fullyCoveredByPackage: 'مغطى بالكامل برصيد الباكيدج',
    sessionFullyCoveredByPackage: 'السيشن مدفوعة بالكامل من رصيد الباكيدج',
    noAdditionalPaymentRequired: 'مفيش أي مبالغ مستحقة الدفع',
    completeSessionAndFreeRoom: 'إتمام السيشن وتحرير الروم',
    selectBtn: 'اختيار',

    // Checkout & Shared Modals
    quickAdd: 'ضيف سريعة',
    discountAndOffers: 'الديسكاونتس والعروض',
    paymentSummary: 'ملخص الدفع',
    baseRate: 'تكلفة السيشن الأساسية',
    checkoutCateringTotal: 'إجمالي الطلبات والمشروبات',
    totalAmount: 'المبلغ الإجمالي للدفع',
    creditCard: 'بطاقة بنكية / فيزا',
    processing: 'جارٍ المعالجة...',
    completeCheckout: 'إتمام التشيك أوت والدفع',
    pickCustomDate: 'اختر تاريخاً محدداً',
    selectDate: 'اختر التاريخ',
    noCateringOrdersYet: 'مفيش طلبات كافيه مضافة بعد',
    apply: 'طبّق',

    // 3. Packages
    packages: 'الباكيدجات',
    addStudentPackage: 'ضيف باكيدج ستيودنت',
    addStudentPackageDesc: 'إنشاء باكيدج ساعات أو اشتراك مخصص للستيودنتس',
    showStudentPackage: 'شوف باكيدجات الستيودنتس',
    showStudentPackageDesc: 'استعراض باكيدجات الستيودنتس النشطة والعروض الترويجية',
    addInstructorPackage: 'ضيف باكيدج إنستراكتور',
    addInstructorPackageDesc: 'تحديد باكيدجات حجز الرومات الخاصة بالإنستراكتورز',
    showInstructorPackage: 'شوف باكيدجات الإنستراكتورز',
    showInstructorPackageDesc: 'استعراض باكيدجات الإنستراكتورز والشركات المعتمدة',
    packageName: 'اسم الباكيدج',
    packageHours: 'عدد الساعات المضمنة',
    packagePrice: 'سعر الباكيدج (ج.م)',
    validityDays: 'صالحة لكام يوم؟',
    savePackage: 'سيف الباكيدج',

    // 4. Shifts
    shifts: 'الشفتات',
    activeShift: 'الشفت الشغال دلوقتي',
    shiftHistory: 'هيستوري الشفتات اللي فاتت',
    addShift: 'افتح شفت جديد',
    addShiftDesc: 'افتح وسجل شفت شغل جديدة للريسبشن',
    showShift: 'عرض الشفتات',
    showShiftDesc: 'سجل الشفتات السابقة وعهد الخزينة والتقارير المالية',
    searchShift: 'سيرش في الشفتات',
    searchShiftDesc: 'السيرش عن الشفت بالتاريخ أو اسم الموظف أو الكود',
    shiftStaffName: 'اسم أدمن الشفت',
    shiftStartTime: 'الشفت فتح الساعة',
    shiftEndTime: 'الشفت قفل الساعة',
    shiftCashDrawer: 'العهدة في الدرج أول الشفت للخزينة (ج.م)',
    saveShift: 'بدء وسيف الشفت',
    openShiftTitle: 'فتح شفت',
    secureTerminalInit: 'تهيئة نقطة البيع الآمنة',
    identityLabel: 'الهوية',
    timestampLabel: 'الوقت والتاريخ',
    openingCashAmount: 'مبلغ نقدية البداية',
    startShiftBtn: 'بدء الشفت',
    shiftInitReady: 'جاهز لبدء سيشن العمل',
    logoutConfirmTitle: 'فيه شفت مفتوحة',
    logoutConfirmMessage: 'لديك شفت جارية دلوقتي. ماذا تريد أن تفعل؟',
    closeShiftAndLogout: 'إغلاق الشفت والتشيك أوت',
    logoutOnly: 'التشيك أوت فقط',
    liveShift: 'مباشر دلوقتي',
    staffLabel: 'الأدمن',
    durationLabel: 'المدة المنقضية',
    closeShiftBtn: 'قفل الشفت والحسابات',
    paymentChannelsTitle: 'قنوات التحصيل وأرصدة الكاش',
    paymentChannelsSub: 'متابعة نقدية الدرج ومحافظ الدفع (كاش، فودافون كاش، إنستاباي، فوري)',
    cashDrawerBadge: 'الدرج والكاش',
    cashTillName: 'كاش في الدرج',
    startingFloatPrefix: 'العهدة في الدرج أول الشفت:',
    eWalletBadge: 'واليت إلكترونية',
    vodafoneCashName: 'فودافون كاش',
    collectedViaWallet: 'المحصل عبر الواليت',
    instantTransferBadge: 'تحويل بنكي فوري',
    instapayName: 'إنستاباي (InstaPay)',
    instantBankTransfers: 'تحويلات إنستاباي الفورية',
    posMachineBadge: 'مكنة فوري',
    fawryName: 'فوري (Fawry)',
    posPaymentsSub: 'مدفوعات مكنة فوري',
    categoryRevenuesTitle: 'توزيع الإيرادات والمصاريف',
    categoryRevenuesSub: 'إجمالي المبيعات حسب الأنشطة (الورك سبيس، الرومات، الباكيدجات، الكافيه، النثريات)',
    workspaceCategory: 'الورك سبيس والسيشنز',
    workspaceCategorySub: 'حجوزات الساعات وقعدة الورك سبيس',
    classroomsCategory: 'الرومات والكلاسات',
    classroomsCategorySub: 'رومات التدريب وورش العمل',
    packagesCategory: 'الباكيدجات والاشتراكات',
    packagesCategorySub: 'اشتراكات الساعات المسبقة',
    cateringCategory: 'الكافيه والمشروبات',
    cateringCategorySub: 'مشروبات وسناكس',
    otherIncomeCategory: 'إيرادات تانية',
    otherIncomeCategorySub: 'برنت ورق وخدمات تانية',
    pettyExpensesCategory: 'المصاريف والنثريات',
    pettyExpensesSub: 'مخصومة من كاش الدرج',
    liveLedgerTitle: 'لايف لدجر حركات الفلوس',
    recordedTransactionsCount: 'حركات متسجلة',
    timeColumn: 'الساعة',
    descriptionColumn: 'البيان / الوصف',
    categoryColumn: 'القسم',
    paymentChannelColumn: 'طريقة الدفع',
    amountColumn: 'المبلغ',
    systemCategory: 'السيستم',
    pettyCashMethod: 'نثريات',
    reconciliationTitle: 'تقفيل ومطابقة حسابات الشفت',
    reconciliationSubtitle: 'جرد كاش الدرج ومطابقة أرصدة فودافون كاش وإنستاباي قبل ما تسلم الشفت',
    financialSummaryTitle: 'ملخص حسابات السيستم (المفروض يكون كام)',
    openingCashLabel: 'كاش الدرج أول الشفت',
    posReceiptsLabel: 'توتال الفلوس اللي دخلت',
    posBadgeText: 'سيستم POS',
    pettyCashOutLabel: 'مصاريف ونثريات خارجة',
    vodafoneBalanceLabel: 'رصيد محفظة فودافون كاش',
    instapayBalanceLabel: 'رصيد إنستاباي (InstaPay)',
    fawryBalanceLabel: 'رصيد مكنة فوري',
    expectedDrawerCashLabel: 'الكاش المفروض تلاقيه في الدرج',
    countNoticeText: 'عد الفلوس الكاش اللي في الدرج كويس، ودخل الرقم هنا عشان السيستم يطابقه.',
    declareTotalsTitle: 'إقرار الفلوس الفعلية وقت تقفيل الشفت',
    actualCashLabel: 'الكاش اللي عديته بإيدك في الدرج',
    actualCashHint: 'اكتب كل الفلوس الورق والفضية اللي لقيتها في الدرج بالمليم',
    varianceStatusLabel: 'حالة الدرج (مظبوط ولا فيه عجز/زيادة)',
    pendingInputText: 'مستنيينك تكتب المبلغ اللي في الدرج...',
    pendingInputSub: 'دخل الكاش اللي عديته عشان نحسبلك الفارق',
    balancedStatusText: 'الدرج مظبوط بالمليم الله ينور!',
    balancedStatusSub: 'الفلوس اللي في الدرج قد اللي على السيستم بالظبط',
    discrepancyText: 'فيه فارق في الحساب:',
    shortageDetected: 'فيه عجز في كاش الدرج',
    surplusDetected: 'فيه زيادة كاش في الدرج',
    confirmCloseShiftBtn: 'قفل الشفت وسلم الحساب',
    cancelBtn: 'كنسل',
    openShiftPopupTitle: 'فتح شفت جديد',
    openShiftPopupSub: 'سجل عهدة الدرج وأرصدة فودافون كاش وإنستاباي أول ما استلمت',
    openShiftEnterBtn: 'افتح الشفت وادخل على السيستم يلا',
    autoAuditLogNotice: 'كل حركة فلوس بتتسجل أوتوماتيك في السيستم',
    startingCashField: 'عهدة الدرج أول ما استلمت (كاش)',
    startingVodafoneField: 'رصيد محفظة فودافون كاش أول الشفت',
    startingInstapayField: 'رصيد إنستاباي أول الشفت (InstaPay)',
    startingFawryField: 'رصيد مكنة فوري أول الشفت',
    exportExcelBtn: 'طلّع شيت إكسيل',
    exportPdfBtn: 'طباعة / PDF',
    shiftHistoryTitle: 'سجل وتقارير الشفتات',
    shiftHistorySubtitle: 'مراجعة الأداء المالي التاريخي، مطابقة فروقات الخزينة، وإكسبورت التقارير.',
    shiftTimeColumn: 'فترة الشفت',
    cashInColumn: 'المقبوضات (داخل)',
    cashOutColumn: 'المصروفات (خارج)',
    finalTotalColumn: 'الإجمالي النهائي',
    varianceColumn: 'الفارق',
    statusColumn: 'الحالة',
    balancedStatusPill: 'متوازن',
    disputedStatusPill: 'فيه خلاف',
    noShiftsFound: 'مفيش شفتات مسجلة مطابقة لخيارات السيرش أو التاريخ المحدد.',
    showingShiftsSummary: 'شوف الشفتات المسجلة',
    searchShiftPlaceholder: 'سيرش بالاسم، الكود، أو التاريخ...',
    allStaffOption: 'كل الموظفين',
    allStatusesOption: 'كل الحالات',
    balancedOption: 'متوازن (مفيش فارق)',
    disputedOption: 'فيه فارق في النقدية',
    applyFiltersBtn: 'طبّق الفلتر',
    noActiveShiftTitle: 'مفيش أي شفت شغال دلوقتي',
    noActiveShiftDesc: 'مفيش شفت مفتوح في السيستم دلوقتي. لازم تفتح شفت جديد عشان تبدأ تسجل حركات الكاش وشغل اليوم.',
    startNewShiftBtn: '+ افتح شفت جديد',
    activeShiftRunningNotice: 'فيه شفت شغال ومفتوح بالفعل في السيستم دلوقتي.',
    goToActiveShiftBtn: 'ادخل على الشفت الشغال',
    startingFloatsTitle: '1. درج الكاش والأرصدة الافتتاحية',
    shiftNotesTitle: '2. نوتس الشفت وتعليمات التسليم',
    shiftNotesPlaceholder: 'اكتب أي نوتس أو كلام عايز تسيبه للشفت اللي بعدك...',
    totalCollectedRevenue: 'توتال الفلوس اللي اتجمعت',
    disputedShiftsCount: 'شفتات فيها عجز أو زيادة',
    balancedShiftsCount: 'شفتات مضبوطة بالمليم',
    viewShiftDetails: 'شوف الديتيلز',
    shiftDetailsTitle: 'تقرير وديتيلز الشفت',
    backToHistoryBtn: 'ارجع لهيستوري الشفتات',
    backToActiveShiftBtn: 'ارجع للشفت الشغال دلوقتي',
    financialLedgerSub: 'تفصيلة كل حركات الفلوس والمصاريف اللي اتسجلت في الشفت',
    resetFiltersBtn: 'رجّع الفلاتر من الأول',
    summaryCards: 'ملخص الفلوس والشغل',
    digitalChannelsReconcile: 'تظبيط ومطابقة أرصدة المحافظ وفودافون كاش',

    // 5. Bookings
    bookings: 'الحجوزات',
    addReservation: 'ضيف حجز',
    addReservationDesc: 'حجز بدري لمكتب، روم أو مساحة خاصة',
    showReservation: 'شوف الحجوزات',
    showReservationDesc: 'تابع الحجوزات اللي جاية والمؤكدة عندك',
    reserverName: 'اسم الكلاينت / الستيودنت',
    reservationDate: 'تاريخ الحجز',
    reservationTimeSlot: 'ميعاد الحجز (من كام لكام)',
    assignedSpace: 'الروم / المكان اللي اتحجز',
    depositAmount: 'العربون اللي دفعه (ج.م)',
    saveReservation: 'أكد وسيف الحجز',
    reservation: 'الحجز',
    adminConsole: 'كونسول الأدمن',
    adminConsoleDesc: 'جدول الرومات ومتابعة الحجوزات اليومية',
    todaysReservations: 'حجوزات اليوم',
    reservationDetails: 'تفاصيل الحجز',
    confirmed: 'متأكدة تمام',
    upcoming: 'جاية في السكة',
    costBreakdown: 'تفاصيل التكلفة',
    baseRateLabel: 'السعر الأساسي',
    equipmentAddon: 'إضافات المعدات (تأجير كاميرات)',
    earlyBirdDiscount: 'ديسكاونت الحجز المبكر',
    studentsCount: 'ستيودنتس',
    cancelReservation: 'كنسل الحجز',
    classroomLabel: 'الروم',
    idLabel: 'المعرف',
    costLabel: 'التكلفة',
    reservations: 'الحجوزات',
    charsLeft: 'حرف متبقي',
    digitsLeft: 'رقم متبقي',
    errorInstructor: 'يجب أن يكون الاسم من 3 إلى 50 حرفاً (أحرف فقط)',
    errorActivity: 'يجب أن يكون اسم النشاط من 3 إلى 60 حرفاً',
    errorPhone: 'رقم الموبايل يجب أن يكون 11 رقماً',
    errorEmail: 'لازم تدخل إيميل صحيح',
    timeAlertCrossMidnight: 'ملاحظة: ينتهي الحجز في اليوم التالي (يقطع منتصف الليل)',
    timeAlertOverlap: 'خطأ: فيه حجز آخر في نفس الوقت لدي الغرفة',
    statusActiveDropdown: 'الحالة: متواجد',
    statusAvailableDropdown: 'الحالة: متاح',
    cateringSubtitle: 'مشروبات وسناكس',
    addCateringLabel: 'ضيف من الكانتين',
    btnProcessCheckout: '✓ إنهاء ودفع السيشن',
    starts: 'تبدأ',
    ends: 'تنتهي',
    cancelled: 'ملغى',
    errorAmountReceivedLow: 'المبلغ المستلم يجب أن يكون مساوياً للمبلغ المطلوب أو أكبر منه',
    instructorPlaceholder: 'مثال: د. أحمد حسن',
    activityPlaceholder: 'مثال: ورشة عمل تفاضل وتكامل، كورس برمجة',
    phonePlaceholder: 'مثال: 01012345678',
    emailPlaceholder: 'مثال: instructor@example.com',
    instructorPackage: 'الباكيدج',
    deductFromPackage: 'ديسكاونت من الباكيدج',
    payCashDirect: 'دفع كاش',
    packageBalance: 'رصيد الباكيدج',
    remainingHoursLabel: 'المتبقي',
    noActivePackage: 'مفيش باكيدج نشطة لده الإنستراكتور',
    deductedFromPackage: 'مخصوم من الباكيدج',
    selectPackageOrCash: 'طريقة الدفع',
    packageActiveBadge: 'باكيدج نشطة',
    ratesAndTiming: 'الموعد والتوقيت',

    // 6. Details
    membersInfo: 'الستيودنتس والديتيلز',
    addDiscount: 'ضيف ديسكاونت',
    addDiscountDesc: 'اعمل كود ديسكاونت أو عروض خاصة للستيودنتس',
    discountCode: 'كود الديسكاونت',
    discountPercent: 'نسبة الديسكاونت (%)',
    saveDiscount: 'سيف كود الديسكاونت',
    showColleges: 'عرض الكليات',
    showCollegesDesc: 'دليل الكليات والجامعات المتعاقد معها',
    showBlacklist: 'عرض البلاك ليست',
    showBlacklistDesc: 'إدارة اليوزرز المتبلك في البلاك ليستين أو الممنوعين من الدخول',
    showInstructors: 'عرض الإنستراكتورز',
    showInstructorsDesc: 'قائمة الإنستراكتورز والمدربين المعتمدين في المساحة',
    instructorName: 'اسم الإنستراكتور',
    specialization: 'التخصص / المجال',
    discountsAndPromoCodes: 'أكواد الديسكاونت والعروض',
    discountsPageSubtitle: 'إنشاء أكواد الديسكاونت والعروض الترويجية ومتابعة نسبة الاستخدام والأرباح',
    createPromoCodeBtn: '+ إنشاء كود ديسكاونت جديد',
    searchDiscountsPlaceholder: 'اسيرش بالكود، العنوان، أو النطاق المتاح...',
    activePromoCodes: 'أكواد الديسكاونت النشطة',
    totalTimesUsed: 'إجمالي مرات الاستخدام',
    totalDiscountValue: 'إجمالي قيمة الديسكاونتس',
    titleDescription: 'عنوان الشوف / الوصف',
    discountValue: 'قيمة الخصم',
    applicableOn: 'متاح على',
    validityPeriod: 'فترة الصلاحية',
    usageLimitTh: 'الاستخدام / الحد الأقصى',
    copyCode: 'نسخ الكود',
    statusDisabled: 'معطل',
    allServicesAndSessions: 'كل الخدمات والسيشنز',
    studentSessionsOnly: 'سيشنز الستيودنتس فقط',
    instructorWorkshopsOnly: 'ورش الإنستراكتورز فقط',
    hourPacksAndRooms: 'باكيدجات الساعات والرومات',
    createNewPromoCodeTitle: 'إنشاء كود ديسكاونت ترويجي جديد',
    editPromoCodeTitle: 'إيديت تفاصيل كود الديسكاونت',
    autoGenerate: 'توليد تلقائي',
    discountType: 'نوع الديسكاونت',
    percentageType: 'نسبة مئوية (%)',
    fixedAmountType: 'مبلغ ثابت (ج.م)',
    startDate: 'تاريخ البداية',
    expirationDate: 'تاريخ الانتهاء',
    saveCode: 'سيف الكود',
    confirmDeleteDiscountTitle: 'تأكيد امسح كود الديسكاونت',
    confirmDeleteDiscountDesc: 'متأكد؟ من امسح كود الديسكاونت نهائياً من النظام؟',
    deleteCodeBtn: 'نعم، اامسح الكود',
    blacklistPageTitle: 'البلاك ليست وسجل التبليك',
    blacklistPageSubtitle: 'إدارة قائمة الستيودنتس والإنستراكتورز المتبلك في البلاك ليستين وسجل المخالفات الإدارية',
    addBlockBtn: '+ ضيف للبلاك ليست',
    searchBlacklistPlaceholder: 'اسيرش بالاسم، رقم الموبايل، أو سبب التبليك...',
    activeBannedCount: 'المتبلك في البلاك ليستون دلوقتي',
    tempRestrictionsCount: 'التبليك المؤقت',
    permanentRestrictionsCount: 'التبليك الدائم',
    resolvedCasesCount: 'حالات تمت تسويتها',
    memberLabel: 'الستيودنت',
    violationReason: 'سبب التبليك والمخالفة',
    blockType: 'نوع التبليك',
    blockDate: 'تاريخ التبليك',
    unblockAction: 'كنسل التبليك',
    temporary: 'مؤقت',
    permanent: 'دائم',
    bannedStatus: 'متبلك في البلاك ليست',
    resolvedStatus: 'تمت التسوية',
    addBlacklistModalTitle: 'ضيف للبلاك ليست',
    searchMemberOrEnter: 'اسيرش عن ستيودنت أو إنستراكتور مسجل...',
    selectSeverity: 'درجة ومدة التبليك',
    tempBlock30Days: 'تبليك مؤقت (قابل للمراجعة)',
    permBlockFinal: 'تبليك دائم ونهائي',
    violationDetailsPlaceholder: 'اكتب تفاصيل المخالفة بالتفصيل...',
    adminNotesOptional: 'ملاحظات إدارية داخلية (اختياري)',
    confirmBlockActionBtn: 'تأكيد التبليك والإدراج',
    confirmUnblockTitle: 'تأكيد رفع البلوك',
    confirmUnblockDesc: 'متأكد إنك عايز ترفع البلوك وترجعله صلاحيات الدخول؟',
    yesUnblockBtn: 'نعم، ارفع التبليك',
    noBlacklistFound: 'مفيش سجلات تبليك مطابقة للسيرش.',
    collegesPageTitle: 'دليل الكليات والجامعات',
    collegesPageSubtitle: 'إدارة بيانات الكليات والجامعات المرتبطة بالستيودنتس والديسكاونتس الأكاديمية',
    addCollegeBtn: '+ ضيف كلية / جامعة',
    searchCollegesPlaceholder: 'اسيرش بالكلية، الجامعة، أو الحرم الجامعي...',
    totalColleges: 'إجمالي الكليات المسجلة',
    totalAffiliatedStudents: 'إجمالي الستيودنتس المسجلين',
    topFaculty: 'الكلية الأكثر نشاطاً',
    collegeNameLabel: 'اسم الكلية / التخصص',
    universityLabel: 'الجامعة الأم',
    campusLocation: 'الحرم الجامعي / الفرع',
    studentsCountTh: 'عدد الستيودنتس',
    addCollegeModalTitle: 'ضيف كلية / تخصص جديد',
    editCollegeModalTitle: 'إيديت بيانات الكلية',
    collegeNameAr: 'اسم الكلية بالعربية',
    collegeNameEn: 'اسم الكلية بالإنجليزية',
    universityAr: 'اسم الجامعة',
    campusAr: 'الحرم الجامعي / المبنى',
    saveCollegeBtn: 'سيف الكلية',
    confirmDeleteCollegeTitle: 'تأكيد امسح الكلية',
    confirmDeleteCollegeDesc: 'متأكد؟ من امسح دي الكلية من النظام؟',
    instructorsPageTitle: 'دليل الإنستراكتورز والمدربين',
    instructorsPageSubtitle: 'إدارة بيانات الإنستراكتورز وأدمني الورش التدريبية وحجوزات الرومات',
    addInstructorBtn: '+ ضيف إنستراكتور جديد',
    searchInstructorsPlaceholder: 'اسيرش بالاسم، التخصص، أو جهة العمل...',
    totalInstructors: 'إجمالي الإنستراكتورز',
    activeInstructors: 'إنستراكتورز نشطين',
    totalWorkshopsGiven: 'إجمالي الورش المقامة',
    instructorTh: 'الإنستراكتور / المدرب',
    specialtyTh: 'التخصص والمجال',
    affiliationTh: 'جهة العمل / الانتماء',
    sessionsCountTh: 'عدد السيشنز',
    addInstructorModalTitle: 'ضيف إنستراكتور / مدرب جديد',
    editInstructorModalTitle: 'إيديت بيانات الإنستراكتور',
    instructorNameLabel: 'اسم الإنستراكتور بالكامل',
    specialtyLabel: 'التخصص والمجال العلمي',
    affiliationLabel: 'جهة العمل / المؤسسة',
    bioLabel: 'نبذة تعريفية مختصرة',
    saveInstructorBtn: 'سيف الإنستراكتور',
    confirmDeleteInstructorTitle: 'تأكيد امسح الإنستراكتور',
    confirmDeleteInstructorDesc: 'متأكد؟ من امسح بيانات ده الإنستراكتور من النظام؟',

    // 7. Catering
    catering: 'الكافيه والكاترينج',
    addProducts: 'ضيف مشروب أو سناك جديد',
    addProductsDesc: 'ضيف مشروبات، سناكس ومقرمشات جديدة في الكافيه',
    showProducts: 'منيو الكافيه والمنتجات',
    showProductsDesc: 'جرد الكافيه ومتابعة الاستوك والأسعار',
    productGraph: 'إحصائيات مبيعات الكافيه',
    productGraphDesc: 'إحصائيات ورسوم بيانية لأكثر المنتجات مبيعاً والإيرادات',
    productName: 'اسم المنتج / المشروب',
    productCategory: 'التصنيف',
    productPrice: 'السعر (ج.م)',
    stockQuantity: 'الكمية في المخزون',
    saveProduct: 'ضيف إلى المخزون',
    salesStats: 'إحصائيات المبيعات الشهرية',
    done: 'تم',

    // Catering Popups, POS & Pages
    addNewProduct: 'ضيف منتج جديد',
    addNewProductSubtitle: 'ضيف منتجات ومشروبات جديدة لقائمة الكافيه والمخزون.',
    productDetails: 'ديتيلز المنتج',
    productNameEnLabel: 'اسم المنتج (إنجليزي) *',
    productNameEnPlaceholder: 'مثلاً: Premium Water Bottle',
    productNameArLabel: 'اسم المنتج (عربي)',
    productNameArPlaceholder: 'مثال: زجاجة مياه بريميوم',
    categoryRequired: 'التصنيف *',
    sellingPriceRequired: 'سعر البيع (ج.م) *',
    costPriceRequired: 'سعر التكلفة (ج.م) *',
    stockQtyOptional: 'الكمية في المخزون',
    expirationDateLabel: 'تاريخ انتهاء الصلاحية',
    expirationDatePlaceholder: 'مثال: Oct 15, 2026 أو N/A',
    saveProductBtn: 'سيف المنتج',
    pleaseEnterProductName: 'لازم تدخل اسم المنتج',
    categorySnacks: 'سناكس ومخبوزات',
    categoryMerchandise: 'منتجات المساحة (Merch)',
    categoryBeverages: 'مشروبات وعصائر',
    categoryCoffee: 'قهوة ساخنة ومثلجة',
    categoryMeals: 'وجبات وسندوتشات',
    allCategories: 'كل التصنيفات',
    productGraphHeaderTitle: 'الرسم البياني للمنتجات',
    productGraphHeaderDesc: 'نظرة عامة على أداء نقاط البيع وحركة المخزون والمبيعات.',
    nookCanteen: 'كافتيريا نوك',
    today: 'اليوم',
    thisWeek: 'ده الأسبوع',
    thisMonth: 'ده الشهر',
    totalRevenue: 'إجمالي الإيرادات',
    mostPopularItem: 'المنتج الأكثر طلباً',
    unitsSoldToday: 'قطعة مباعة اليوم',
    averageOrderValue: 'متوسط قيمة الطلب',
    revenueByCategory: 'الإيرادات حسب التصنيف',
    transactions: 'معاملة',
    cardPayment: 'بطاقة بنكية (Card)',
    appPayment: 'طبّق (فودافون/إنستاباي)',
    cashPayment: 'نقدي (كاش)',
    topProductsByRevenue: 'أعلى المنتجات إيراداً',
    viewAll: 'شوف الكل',
    thProduct: 'المنتج',
    thSellingPrice: 'سعر البيع',
    thCostPrice: 'سعر التكلفة',
    thStock: 'المخزون',
    thSales: 'المبيعات',
    thRevenue: 'الإيراد',
    thExpiration: 'تاريخ الصلاحية',
    thStatus: 'الحالة',
    thActions: 'الإجراءات',
    exportData: 'إكسبورت البيانات',
    exportProductsCsvTitle: 'إكسبورت بيانات المنتجات إلى CSV',
    addProduct: '+ ضيف منتج',
    searchProductPlaceholder: 'سيرش باسم المنتج أو التصنيف...',
    statusHealthy: 'متوفر',
    statusLowStock: 'مخزون منخفض',
    statusExpiringSoon: 'قريب الانتهاء',
    statusExpired: 'منتهي الصلاحية',
    editProduct: 'إيديت المنتج',
    confirmDeleteProduct: 'متأكد؟ من امسح ده المنتج؟',
    noProductsFound: 'مفيش منتجات مطابقة للسيرش',
    showing: 'شوف',
    to: 'إلى',
    of: 'من',
    entries: 'عناصر',
    prev: 'السابق',
    next: 'التالي',
    editProductTitle: 'إيديت بيانات المنتج',
    priceBelowCostWarning: 'تنبيه: سعر البيع أقل من سعر التكلفة (سوف يسبب خسارة مادية)!',
    productIdentity: 'بيانات المنتج الأساسية',
    barcodeSerial: 'الباركود / الرقم التسلسلي',
    pricingSection: 'التسعير والتكلفة',
    sellingPriceLabel: 'سعر البيع',
    costPriceLabel: 'سعر التكلفة',
    expirationDateOptional: 'تاريخ انتهاء الصلاحية (اختياري)',
    inventorySection: 'المخزون والكميات',
    initialStock: 'الكمية الابتدائية',
    reorderLevel: 'حد إعادة الطلب',
    productImage: 'صورة المنتج',
    uploadProductImage: 'رفع صورة المنتج',
    productAddedSuccess: 'تمت ضيف المنتج بنجاح',
    productAddedDesc: 'متاح دلوقتي في المخزون وجاهز للبيع فوراً.',
    inStockLabel: 'في المخزون',
    addAnother: 'ضيف منتج آخر',
    viewInventory: 'شوف المخزون',
    posCanteen: 'كافتيريا نوك',
    currentOrder: 'الطلب الحالي',
    allItems: 'كل الأصناف',
    directCashSale: 'إتمام البيع النقدي المباشر',
    orderCompletedSuccess: 'تم تسجيل عملية البيع بنجاح!',
    emptyCartMessage: 'مفيش منتجات في السلة. انقر على أي منتج لإضافته للطلب.',
    clearCart: 'تفريغ السلة',
    productNamePlaceholder: 'مثال: نسكافيه كلاسيك، كرواسون',
    addNewCategoryOption: '➕ ضيف تصنيف جديد...',
    newCategoryNamePlaceholder: 'اسم التصنيف الجديد...',
    barcodeOptional: 'الرقم التسلسلي / الباركود (اختياري)',
    barcodeLeaveEmpty: 'اتركه فارغاً إن لم يتوفر',
    pricingAndCost: 'التسعير والتكلفة',
    financialLossWarning: 'تنبيه مالي: سعر البيع أقل من سعر التكلفة (سوف يسبب خسارة مادية)!',
    noExpiration: 'بدون صلاحية (N/A)',
    noExpirationChecked: '✓ بدون صلاحية',
    noExpirationDisplay: 'بدون تاريخ انتهاء صلاحية (N/A)',
    selectExpirationDate: 'اختر تاريخ الصلاحية...',
    inventoryAndStock: 'المخزون والكميات',
    boxCalculator: 'حساب بالعلبة / الكرتونة',
    numberOfBoxes: 'عدد العلب / الكراتين',
    unitsPerBox: 'القطع في العلبة',
    boxPlaceholder: 'مثال: 5',
    unitsPlaceholder: 'مثال: 12',
    totalCalculatedStock: 'إجمالي المخزون المحسوب:',
    unitsLabel: 'قطعة',
    reorderThreshold: 'حد إعادة الطلب (التنبيه عند نقص المخزون)',
    productImageOptional: 'صورة المنتج (اختياري)',
    imageFileFormat: 'PNG, JPG حتى 5MB',
    removeImage: 'امسح الصورة',
    addProductToInventory: 'ضيف المنتج للمخزون',
    cashierLabel: 'الكاشير:',
    sessionCatering: 'طلب كاترنج للسيشن',
    viewPreviousOrders: 'شوف تفاصيل الأصناف المطلوبة سابقاً للسيشن',
    previousOrders: 'الطلبات السابقة:',
    itemsCount: 'أصناف',
    itemsPreviouslyBilled: 'الأصناف والمشروبات المسجلة مسبقاً للسيشن',
    itemsPreviouslyBilledDesc: 'دي الأصناف مضافة على حساب السيشن الحالي ومخصومة من المخزن',
    previousTotal: 'إجمالي الطلبات السابقة:',
    hide: 'إخفاء',
    noDetailedItemsRecorded: 'مفيش تفاصيل أصناف مسجلة لده الطلب.',
    searchProductsQuick: 'سيرش سريع عن منتج...',
    outOfStock: 'غير متوفر',
    clickToAddToOrder: 'انقر للضيف إلى الطلب',
    inStock: 'متاح',
    noMatchingProductsInCategory: 'مفيش منتجات مطابقة في ده التصنيف',
    cartEmptyTitle: 'السلة فارغة',
    cartEmptyDesc: 'انقر على أي منتج من الكتالوج لإضافته للطلب فوراً.',
    addToRoomSessionBtn: 'ضيف لحساب الروم والشفت',
    saleSuccessShift: 'تم تسجيل البيع وإضافته لشفت الكاشير بنجاح!',
    barcodeLabel: 'باركود',
    previousCategories: 'التصنيفات السابقة',
    nextCategories: 'التصنيفات التالية',
    addedToRoomAndShiftSuccess: 'تمت ضيف المبلغ لحساب الروم والشفت بنجاح!',

    // 8. Settings
    settings: 'السيستينجز',
    addUser: 'ضيف يوزر / موظف جديد',
    addUserDesc: 'أكونت جديد لموظف أو أدمن وحدد صلاحياته',
    showUsers: 'شوف اليوزرز',
    showUsersDesc: 'قايمة بكل الأدمنز والستاف اللي شغالين',
    userRole: 'رول اليوزر (أدمن ولا ستاف)',
    saveUser: 'سيف الحساب',
    systemSettingsTitle: 'إعدادات النظام والمساحات',
    systemSettingsSubtitle: 'إدارة تسعير ساعات الستيودنتس، رومات ومساحات العمل، وقوالب الباكيدجات السريعة',
    addPricingTierBtn: '+ ضيف شريحة تسعير',
    addRoomSpaceBtn: '+ ضيف روم / مساحة',
    addPackagePresetBtn: '+ ضيف قالب باكيدج',
    studentHourlyPricingTab: 'تسعير ساعات الستيودنتس',
    classroomsZonesTab: 'إدارة الرومات والمساحات',
    quickPackagePresetsTab: 'قوالب الباكيدجات السريعة',
    packageTargetLabel: 'نوع الباقة والفئة المستهدفة',
    studentPackagesFilter: 'باقات الطلاب (Workspace)',
    instructorPackagesFilter: 'باقات المدربين (Classroom)',
    allPackagesFilter: 'كل الباقات',
    studentPackageTypeOption: 'طلاب (Workspace)',
    instructorPackageTypeOption: 'مدربين (Classroom)',
    packageAudienceHeader: 'الفئة المستهدفة',
    studentBadgeText: 'طلاب',
    instructorBadgeText: 'مدربين',
    fromHoursHeader: 'من (ساعات)',
    toHoursHeader: 'إلى (ساعات)',
    duePriceHeader: 'السعر المستحق',
    tierDescriptionHeader: 'وصف الشريحة',
    noPricingTiersAdded: 'مفيش شرائح تسعير مضافة',
    noPackagePresetsAdded: 'مفيش قوالب باكيدجات مضافة',
    roomCapacityCap: 'فرد',
    egpPerHourShort: 'ج.م / ساعة',
    defaultValidity: 'الصلاحية الافتراضية',
    addNewTierModalTitle: 'ضيف شريحة تسعير جديدة',
    editTierModalTitle: 'إيديت شريحة التسعير',
    fromHoursLabel: 'من عدد ساعات',
    toHoursLabel: 'إلى عدد ساعات',
    priceDueLabel: 'السعر المستحق (ج.م)',
    arabicLabelDesc: 'الوصف بالعربي',
    saveTierBtn: 'سيف الشريحة',
    addNewRoomModalTitle: 'ضيف روم / مساحة جديدة',
    editRoomModalTitle: 'إيديت الروم',
    spaceTypeLabel: 'نوع المكان',
    capacityStudentsLabel: 'السعة القصوى (أفراد)',
    roomImageUrlLabel: 'رابط صورة الروم (Image URL)',
    roomImageUploadLabel: 'صورة الروم / القاعة',
    clickToUploadRoomImage: 'اضغط لاختيار صورة من جهازك',
    roomImageFileFormatHint: 'يدعم صيغ PNG, JPG, JPEG, WEBP (حد أقصى 5MB)',
    saveRoomBtn: 'سيف الروم',
    addNewPackagePresetModalTitle: 'ضيف قالب باكيدج جديد',
    editPackagePresetModalTitle: 'إيديت قالب الباكيدج',
    packageHoursLabel: 'عدد ساعات الباكيدج',
    customValidityDaysLabel: 'صلاحية مخصصة (بالأيام)',
    customOptionLabel: 'مخصص',
    customDaysPlaceholder: 'مثال: 45، 90، 120...',
    quickPresetHoursLabel: 'خيارات سريعة للساعات',
    savePackagePresetBtn: 'سيف الباكيدج',
    systemUsersRolesTitle: 'اليوزرز والبيرميشنز',
    systemUsersRolesSubtitle: 'إدارة حسابات اليوزرز، بيرميشنز الوصول للنظام، وحالات الحسابات',
    searchUsersPlaceholder: 'سيرش باسم اليوزر، البريد، الهاتف، أو الصلاحية...',
    addNewUserBtn: '+ ضيف يوزر جديد',
    totalUsersKpi: 'إجمالي المستخدمين',
    adminsSupervisorsKpi: 'المديرين والمسؤولين',
    receptionCashiersKpi: 'موظفين الاستقبال',
    userAccountTh: 'اليوزر / الحساب',
    rolePermissionTh: 'الصلاحية / الدور',
    accountStatusTh: 'حالة الحساب',
    createdDateTh: 'تاريخ الإنشاء',
    adminManagerRole: 'المدير (Admin)',
    supervisorRole: 'المشرف (Supervisor)',
    receptionCashierRole: 'موظف الاستقبال (Receptionist)',
    memberRole: 'عضو',
    statusActiveText: 'نشط',
    statusDisabledText: 'غير نشط',
    noUsersFoundTitle: 'مفيش يوزرز',
    noUsersFoundSubtitle: 'مفيش حسابات مطابقة لمعايير السيرش الحالية',
    showingUsersSummary: 'شوف حسابات اليوزرز',
    addNewUserModalTitle: 'ضيف حساب يوزر جديد',
    editUserModalTitle: 'إيديت حساب اليوزر',
    usernameLabel: 'اسم اليوزر (Username)',
    passwordLabel: 'كلمة المرور',
    resetPasswordOptional: 'رجّع من الأول كلمة المرور (اختياري)',
    rolePermissionLabel: 'الصلاحية / نوع الحساب',
    classroomOption: 'Classroom',
    silentZoneOption: 'Silent Zone',
    sharedSpaceOption: 'Shared Space',
    tierLabelPlaceholder: 'مثال: 1 إلى 3 ساعات',
    packagePresetPlaceholder: 'مثال: باكيدج 20 ساعة',
    validFromHoursRequired: 'لازم تدخل عدد ساعات البداية بشكل صحيح',
    toHoursGreaterThanFrom: 'ساعات النهاية يجب أن تكون أكبر من ساعات البداية',
    validPriceRequired: 'لازم تدخل سعر شريحة الساعات',
    roomNameRequired: 'لازم تدخل اسم الروم أو المساحة',
    packageHoursRequired: 'لازم تحدد عدد ساعات الباكيدج',

    // Dashboard Overview
    welcome: 'منور يا باشا، نورت NOOK!',
    welcomeBack: 'يا مرحب بيك،',
    dashboardSubtitle: 'الداشبورد لمتابعة وحسابات رومات وسيشنز ورك سبيس NOOK',
    viewBookings: 'شوف كل الحجوزات',
    activeBookings: 'الحجوزات الشغالة دلوقتي',
    availableDesks: 'المكاتب المتاحة',
    activeMembers: 'الناس اللي منورانا دلوقتي',
    occupancyRate: 'معدل الإشغال',
    thisMonthTrend: '▲ 12% ده الشهر',
    readyToBook: 'جاهز للحجز',
    activeNow: 'نشط دلوقتي',
    goodPerformance: 'أداء ممتاز',
    bookingsByDay: 'الحجوزات حسب اليوم',
    spaceDistribution: 'توزيع الأماكن والرومات',
    privateDesks: 'مكاتب خاصة (Private)',
    sharedSpaces: 'شيرد سبيس (مساحات مشتركة)',
    meetingRooms: 'ميتنج رومات واجتماعات',
    contentArea: 'مساحة المحتوى',
    contentDesc1: 'ابنِ محتوى الصفحة هنا — جداول، رسوم بيانية.',
    contentDesc2: 'ده الجزء جاهز ليملأه الفريق.',
    createAndManageDiscounts: 'اعمل وظبط الديسكاونتس والعروض',
    fastCheckInDesc: 'تشيك إن سريع لسيشن في الورك سبيس',
    quickCheckIn: 'تشيك إن على الماشي',
    configureNewRoomDesc: 'تجهيز ورشة عمل أو روم جديدة',
    setupRoom: 'تجهيز روم',
    shiftHandoverDesc: 'تسليم الشفت وتظبيط الكاش',
    activityOccupancyFlow: 'حركة الناس ونسبة الإشغال',
    peakToday: 'أعلى زحمة النهارده',
    todayHourly: 'النهارده (بالساعات)',
    weekly: 'بالأسبوع',
    peakTime: 'وقت الزحمة',
    avgSession: 'متوسط وقت السيشن',
    totalFootfall: 'إجمالي الناس اللي شرفت',
    currentActiveStudents: 'الستيودنتس اللي قاعدين جوه دلوقتي',
    deskSpace: 'المكان / الروم',
    todaysRoomBookings: 'حجوزات الرومات والكلاسات النهارده',
    viewSchedule: 'شوف جدول الحجوزات كله',
    inProgress: 'شغالة دلوقتي',
    seatsLabel: 'كرسي',

    // 9. Packages (Student & Instructor)
    details: 'التفاصيل',
    packagesTitle: 'الباكيدجات والاشتراكات',
    studentPackagesTitle: 'باكيدجات واشتراكات الستيودنتس',
    studentPackagesSubtitle: 'إدارة باكيدجات الساعات المسبقة، تتبع الاستهلاك، وتجديد الباكيدج',
    instructorPackagesTitle: 'باكيدجات الإنستراكتورز والشركات',
    instructorPackagesSubtitle: 'إدارة باكيدجات حجز الرومات المسبقة، تتبع استهلاك ورش العمل، وساعات التدريب',
    sellStudentPackage: 'بيع باكيدج ستيودنت',
    sellInstructorPackage: 'بيع باكيدج إنستراكتور',
    sellStudentPackageTitle: 'بيع وتفعيل باكيدج ستيودنت جديدة',
    sellStudentPackageSubtitle: 'تخصيص رصيد ساعات دراسية، اختيار الستيودنتس، وتأكيد وسيلة الدفع',
    sellInstructorPackageTitle: 'بيع وتفعيل باكيدج إنستراكتور جديدة',
    sellInstructorPackageSubtitle: 'تخصيص رصيد ساعات رومات، اختيار الإنستراكتورز، وتأكيد وسيلة الدفع',
    activeStudentPasses: 'الباكيدجات النشطة',
    activeInstructorPacks: 'باكيدجات الإنستراكتورز النشطة',
    totalRemainingBalance: 'إجمالي الساعات المتبقية',
    expiringSoonLow: 'أوشكت على الانتهاء',
    studentPackagesValue: 'قيمة مبيعات الباكيدجات',
    instructorPackagesValue: 'قيمة مبيعات باكيدجات الرومات',
    allPackages: 'كل الباكيدجات',
    activePasses: 'باكيدجات نشطة',
    exhaustedPasses: 'رصيد مستنفد',
    expiredPasses: 'منتهية الصلاحية',
    nearExpiryPasses: 'أوشكت على الانتهاء',
    statusActivePass: 'نشط',
    statusNearExpiryPass: 'أوشك على الانتهاء',
    statusExhaustedPass: 'مستنفد',
    statusExpiredPass: 'منتهي',
    searchStudentPackagePlaceholder: 'سيرش بالاسم أو الهاتف...',
    searchInstructorPackagePlaceholder: 'سيرش بالإنستراكتور أو الباكيدج...',
    studentOrMembers: 'الستيودنتس',
    instructorOrEntity: 'الإنستراكتور / الجهة',
    allocatedHours: 'الساعات الممنوحة',
    usedHours: 'المستهلك',
    remainingHours: 'المتبقي',
    costCost: 'القيمة',
    expiryDate: 'تاريخ الانتهاء',
    noStudentPackagesFound: 'مفيش باكيدجات ستيودنتس مسجلة مطابقة للسيرش.',
    noInstructorPackagesFound: 'مفيش باكيدجات إنستراكتورز مسجلة مطابقة للسيرش.',
    groupStudentsCount: 'ستيودنتس',
    showingPackagesSummary: 'باكيدج',
    viewDetailsAndHistory: 'شوف التفاصيل وسجل الاستهلاك',
    deletePackageAction: 'امسح الباكيدج',
    memberDataSection: 'بيانات الستيودنت',
    instructorDataSection: 'بيانات الإنستراكتور / الجهة',
    searchMemberLabel: 'السيرش عن الستيودنت بالاسم أو الهاتف',
    searchInstructorLabel: 'السيرش عن الإنستراكتور بالاسم أو الهاتف',
    searchMemberInputPlaceholder: 'اكتب اسم الستيودنت للسيرش والضيف...',
    searchInstructorInputPlaceholder: 'اكتب اسم الإنستراكتور للسيرش والضيف...',
    addMemberBadge: 'ضيف',
    dateAndValiditySection: 'التاريخ والصلاحية',
    packageStartDate: 'تاريخ بدء الباكيدج',
    packageExpiryDate: 'تاريخ انتهاء الصلاحية',
    packageNotesPlaceholder: 'ملاحظات إضافية على الباكيدج أو شروط خاصة...',
    selectHoursPackage: 'اختيار باكيدج الساعات',
    customPackageHours: 'عدد الساعات المخصصة',
    customPackageRate: 'سعر الساعة (ج.م)',
    packageSummaryAndPayment: 'ملخص الباكيدج والدفع',
    selectedPackageLabel: 'الباكيدج المختارة',
    studentsCountLabel: 'عدد الستيودنتس المشتركين',
    instructorsCountLabel: 'عدد الإنستراكتورز المشتركين',
    hoursQuota: 'رصيد الساعات الممنوح',
    effectiveRatePerHour: 'سعر الساعة الفعلي',
    totalDueRequired: 'الإجمالي المطلوب',
    hideDiscount: 'إخفاء خيار الديسكاونت',
    addDiscountCoupon: '+ ضيف كود ديسكاونت',
    enterCouponCodePlaceholder: 'أدخل كود الديسكاونت (مثال: STUDENT10)...',
    paymentMethodLabel: 'طريقة الدفع',
    vodafonePayment: 'فودافون كاش',
    instapayPayment: 'إنستاباي',
    fawryPayment: 'فوري',
    amountReceivedLabel: 'المبلغ المستلم',
    amountReceivedPlaceholder: '0.00 ج.م',
    cashShortAlert: 'المبلغ المستلم أقل من الإجمالي المطلوب',
    changeDueCustomer: 'المتبقي للعميل (الباقي)',
    confirmAndCompleteSale: 'تأكيد وإتمام بيع الباكيدج',
    packageValidityDays: 'يوم',
    optionsCount: 'خيارات',
    egpPerHour: 'ج.م/س',
    studentPassTag: 'باكيدج ستيودنت',
    instructorPassTag: 'باكيدج إنستراكتور',
    enrolledGroupMembers: 'الستيودنتس المشتركون في دي الباكيدج',
    remainingBalanceRate: 'معدل الرصيد المتبقي',
    consumedLabel: 'المستهلك',
    remainingLabel: 'المتبقي',
    totalLabel: 'الإجمالي',
    costPaid: 'سعر الشراء',
    purchasedDate: 'تاريخ التفعيل',
    expiryAndNotesSettings: 'إعدادات الصلاحية والملاحظات',
    unlockEdit: 'إيديت',
    lockEdit: 'قفل',
    savePackageModifications: 'سيف الإيديتات',
    usageSessionsLog: 'سجل الاستهلاك والسيشنز',
    registeredSessionsCount: 'سيشن مسجلة',
    deductHoursBtn: 'ديسكاونت ساعات',
    noUsageSessionsYet: 'لم يتم تسجيل أي استهلاك ساعات على دي الباكيدج حتى دلوقتي.',
    closeBtn: 'إغلاق',
    deductSessionTitle: 'تسجيل سيشن وديسكاونت ساعات',
    deductSessionSubtitle: 'ديسكاونت الساعات المستهلكة من رصيد الباكيدج الحالي',
    sessionTitleLabel: 'عنوان أو موضوع السيشن',
    hoursToDeductLabel: 'الساعات المراد ديسكاونتها',
    deskLocationLabel: 'المكان / المكتب',
    confirmDeductionBtn: 'تأكيد الديسكاونت',
    confirmDeleteStudentPackageTitle: 'تأكيد امسح باكيدج الستيودنت',
    confirmDeleteInstructorPackageTitle: 'تأكيد امسح باكيدج الإنستراكتور',
    confirmDeleteStudentPackageDesc: 'متأكد إنك عايز تمسح باكيدج الستيودنت نهائياً؟',
    confirmDeleteInstructorPackageDesc: 'متأكد إنك عايز تمسح باكيدج الإنستراكتور نهائياً؟',
    adminPasswordConfirmation: 'كلمة مرور الأدمن للتأكيد',
    adminPasswordPlaceholder: 'أدخل كلمة مرور الأدمن (مثال: 1234)',
    yesDeletePackage: 'نعم، اامسح الباكيدج',

    // Roles & Permissions Matrix
    rolesAndPermissionsTab: 'الأدوار والصلاحيات',
    rolesMatrixTitle: 'مصفوفة الأدوار وصلاحيات النظام',
    rolesMatrixSubtitle: 'تحديد وتوضيح صلاحيات الوصول لكل دور وظيفي في مساحة NOOK',
    adminRoleBadge: 'المدير (Admin)',
    adminRoleDesc: 'تحكم كامل وشامل في جميع الوحدات، الحسابات، الإعدادات، والأسعار',
    supervisorRoleBadge: 'المشرف (Supervisor)',
    supervisorRoleDesc: 'إدارة العمليات والتقارير المالية والخصومات والورديات',
    receptionistRoleBadge: 'موظف الاستقبال (Receptionist)',
    receptionistRoleDesc: 'إدارة العمليات والورديات، تسجيل دخول وخروج الطلاب، حجز القاعات، الكانتين، الباقات والخصومات، والتقارير المالية',
    memberRoleBadge: 'العضو / الطالب (Member)',
    memberRoleDesc: 'استخدام مساحة العمل، حجز باقة، وشراء المأكولات والمشروبات',
    moduleAndFeatureColumn: 'الوحدة والوظيفة',

    // Shift & Cash Ledger
    adminFundLabel: 'العهدة الإدارية:',
    insideFlow: 'داخل',
    outsideFlow: 'خارج',
    insideFlowFull: 'فلوس داخلة',
    outsideFlowFull: 'فلوس خارجة',
    searchTransactionsPlaceholder: 'سيرش في المعاملات وحركات الفلوس...',
    allPaymentChannels: 'كل طرق وقنوات الدفع',
    twoShiftsRunningWarning: 'مينفعش تفتح شفتين في نفس الوقت! لازم تقفل الشفت الشغال الأول قبل ما تفتح شفت جديد.',
    printShiftSummaryBtn: 'اطبع تقفيلة وتقرير الشفت',
    closingNotesLabel: 'نوتس وملاحظات قفل الشفت:',

    // Packages Management
    editPackageTitle: 'تعديل بيانات الباكيدج',
    editInstructorPackageTitle: 'تعديل باكيدج الإنستراكتور',
    totalHoursLabel: 'إجمالي الساعات',
    totalCostLabel: 'السعر الإجمالي (ج.م)',
    expiryDateLabel: 'تاريخ الانتهاء',
    notesLabel: 'نوتس وملاحظات',

    // Classroom Reservations
    newReservation: 'حجز جديد',
    newReservationTitle: 'إضافة حجز جديد',
    duplicateReservationBtn: 'كرر الحجز (دوبليكيت)',
    duplicateReservationTitle: 'تكرار الحجز (دوبليكيت)',
    editReservationTitle: 'تعديل الحجز',
    splitReservationBtn: 'قص / قسّم',
    splitReservationTitle: 'قص / تقسيم وقت الحجز',
    splitIntervalDesc: 'حدد الشوية اللي عايز تقصهم وتشيلهم من الحجز الأصلي:',
    cutStartTime: 'بداية القص',
    cutEndTime: 'نهاية القص',
    splitNote: 'الحجز هيتقسم لوحده لحتتين (قبل القص وبعد القص) والفلوس والساعات هتتحسب أوتوماتيك لكل حتة.',
    confirmSplitBtn: 'قص الحجز دلوقتي',
    deleteReservationBtn: 'امسح الحجز',
    copySuffix: ' (نسخة متكررة)',

    // Catering Products
    savingProduct: 'ثانية واحدة بنسيف...',
    addingProduct: 'ثانية واحدة بنضيف...',
    productExpiredTooltip: 'المنتج ده إكسبايرد ومينفعش يتباع للزبون',
    expiredStatus: 'إكسبايرد (منتهي)',

    // Workspace & Checkout
    printingLabel: 'برنت الورق',
    printingPagesRate: 'ورقة (1.50 ج.م للورقة)',
    premiumWiFi: 'خدمة واي فاي سريع VIP',
    paidDeposit: 'عربون مدفوع مقدماً',
    discountReduction: 'الديسكاونت والخصم',
    studentPackageMethod: 'خصم من ساعات الباكيدج',
    partialPaymentDue: 'دفع جزء والباقي عليه',
    applyDiscountTitle: 'تطبيق الخصم والديسكاونت',
    discountTypeLabel: 'نوع الديسكاونت',
    percentageOption: 'نسبة مئوية (%)',
    fixedAmountOption: 'مبلغ كاش ثابت (ج.م)',
    percentageValueLabel: 'كام في المية (%)',
    discountAmountLabel: 'المبلغ اللي اتخصم (ج.م)',
    exportDisplayedResults: 'طلّع النتائج دي بره',
    exportDisplayedToCSV: 'طلّع النتائج المعروضة شيت CSV',
    deleteSession: 'امسح السيشن دي',
    showingLabel: 'عرض',
    toLabel: 'لحد',
    ofLabel: 'من إجمالي',
    activeStudentsCountLabel: 'ستيودنت قاعدين',
    historyStudentsCountLabel: 'سيشن سابقة',
    perPageLabel: 'في الصفحة الواحدة:',
    workshopSession: 'ورشة عمل تدريبية',
    sharedSpace: 'شيرد سبيس (مساحة مشتركة)',
    duringSession: 'وهو قاعد في السيشن',
    baseSessionCost: 'حساب قعدة السيشن الأساسي',
    drinksAndSnacksSub: 'مشروبات وسناكس من الكافيه',
    addCateringItemBtn: '+ زوّد طلب',
    printingHandoutsSub: 'ملازم وورق مطبوع',
    processPaymentAndFree: '✓ حاسب وقفل السيشن واعمل تشيك أوت',
    studentNameRequired: 'لازم تكتب اسم الستيودنت',
    phoneNumberRequired: 'لازم تكتب رقم الموبايل',
    noDataToExport: 'مفيش أي داتا طالعة بالفلتر ده عشان نصدرها',
    resultsExportedSuccess: 'اتصدرت الداتا تمام وشيت الـ CSV جاهز!',
    invalidCouponCode: 'كود البروموكود ده مش شغال أو غلط',

    // Details & Settings Messages
    threeWordsNameRequired: 'لازم تدخل الاسم ثلاثي كامل (على الأقل 3 كلمات يا باشا)',
    validEmailFormatRequired: 'دخل إيميل مظبوط زي name@example.com',
    promoCodeRequired: 'اكتب كود الديسكاونت أو خليه يتولد لوحده',
    discountTitleRequired: 'اكتب اسم أو عنوان العرض ده',
    expiryDateRequired: 'حدد هيخلص إمتى بالظبط',
    expiryDateCannotBePast: 'مينفعش تختار تاريخ ديسكاونت خلصان في الماضي!',
    collegeNameRequired: 'اكتب اسم الكلية أو الجامعة',
    universityNameRequired: 'اكتب اسم الجامعة التابعة ليها',
    memberNameRequired: 'اختار أو اكتب اسم الستيودنت أو الإنستراكتور المتبلك',
    blockReasonRequired: 'اكتب متبلك ليه وعمل إيه مخالف',
    namePlaceholderExample: 'مثلاً: أحمد محمود',
    usernamePlaceholderExample: 'مثلاً: ahmed_admin',
    editStudentTitle: 'تعديل بيانات الستيودنت',
    editStudentSubtitle: 'عدل بيانات الستيودنت الأساسية وميعاد السيشن والروم بتاعته',
    existingStudentDetected: 'ستيودنت قديم معانا (جبنالك بياناته على طول)',
    quickStudentSearch: 'سيرش سريع على الستيودنت',
    quickStudentSearchPlaceholder: 'سيرش باسم الستيودنت أو رقم موبايله...',
    activePackageBadge: 'باكيدج شغالة',
    standardSessionBadge: 'سيشن عادية',
    dateTimeSection: 'التاريخ والوقت',
    startTimeLabel: 'بدأ الساعة كام',
    openTimeBadge: 'وقت مفتوح',
    openSessionToggle: 'مفتوحة براحته',
    nowBtn: 'دلوقتي حالا',
    invalidTimeRangeNotice: 'الوقت مش راكب: وقت التشيك أوت لازم يكون بعد وقت التشيك إن!',
    paymentMethodAndPackage: 'هيدفع إزاي؟ والباكيدج',
    deductFromHoursPackage: 'اخصم من ساعات الباكيدج',
    noActivePackageForStudent: 'مفيش أي باكيدج شغالة للستيودنت ده',
    selectRoomArea: 'اختار الروم / المكان',
    sharedSpaceRooms: 'رومات الشيرنج',
    silentZoneRooms: 'رومات السايلنت',
    extraServicesAndAmenities: 'سيرفيسز وخدمات إضافية',
    printingPagesLabel: 'برنت الورق (عدد الورق)',
    packageAndServicesDetails: 'ديتيلز الباكيدج والخدمات',
    digitalChannelsActualBalances: 'مطابقة أرصدة المحافظ وقنوات الدفع',
    cutSubRangeInvalid: 'وقت القص لازم يكون جوه فترة الحجز مش بره.',
    confirmDeleteBookingPrompt: 'متأكد إنك عايز تمسح الحجز ده خالص؟',
    adminAccountProtected: 'أكونت الأدمن ده محمي وشغال على طول ومينفعش تعطله',
    cannotDeleteOwnAccount: 'مينفعش تمسح أكونتك وأنت فاتح منه وشغال دلوقتي!',
    cannotDeleteLastAdmin: 'مينفعش تمسح آخر أدمن في السيستم، لازم يفضل فيه أدمن!',
    noTransactionsForChannel: 'مفيش أي حركات فلوس اتسجلت على طريقة الدفع دي',
    requiredText: 'مطلوب تدخله',
    totalOpeningFloatBalance: 'توتال درج الكاش والعهدة الافتتاحية:',
    frontDeskStaff: 'ريسبشنست / موظف الاستقبال',
    clickToViewShiftDetails: 'دوس هنا عشان تشوف ديتيلز الشفت بالتفصيل',
    studentsUnit: 'ستيودنت',
    estimatedCollegeCapacity: 'سعة الكلية التقديرية بالتقريب',
    derivedFromRegisteredColleges: 'محسوبة أوتوماتيك من الكليات المتسجلة',
    discountOffBadge: 'خصم',
    general: 'عام',
    bookingSummaryHeading: 'ملخص الحجز والحساب',
    selectedRoomLabel: 'الروم اللي اتنقت',
    egpPerHourRate: 'ج.م/ساعة',
    planTypeLabel: 'طريقة الدفع والحساب',
    packageDeductionLabel: 'اخصم من الباكيدج',
    estimatedDurationLabel: 'هيقعد قد إيه تقريباً؟',
    openEndedSessionLabel: 'سيشن مفتوحة براحته',
    hoursUnit: 'ساعات',
    printingFeeLabel: 'حساب برنت الورق',
    pagesUnit: 'ورقة',
    walletDepositLabel: 'شحن الواليت',
    amMarker: 'ص',
    pmMarker: 'م',
    egpPerPage: 'ج.م/ورقة',
    wifiVoucherPlaceholder: 'مثلاً: NOOK-WIFI-99',
    freshOrangeJuicePlaceholder: 'مثلاً: عصير برتقال فريش',
    hrsBadge: 'س'
  }
};

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private static getInitialLang(): Lang {
    if (typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('nook_lang');
        if (saved === 'ar' || saved === 'en') {
          return saved;
        }
      } catch (e) {}
    }
    return 'ar';
  }

  currentLang = signal<Lang>(LanguageService.getInitialLang());

  isArabic = computed(() => this.currentLang() === 'ar');
  t = computed(() => TRANSLATIONS[this.currentLang()]);

  constructor() {
    this.setLanguage(this.currentLang());
  }

  toggleLanguage(): void {
    const nextLang: Lang = this.currentLang() === 'en' ? 'ar' : 'en';
    this.setLanguage(nextLang);
  }

  setLanguage(lang: Lang): void {
    this.currentLang.set(lang);
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('nook_lang', lang);
      } catch (e) {}
    }
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
  }

  formatNameLocale(name?: string): string {
    if (!name) return '';
    let trimmed = name.trim();
    if (this.isArabic()) {
      // Normalize titles
      trimmed = trimmed
        .replace(/^dr\.?\s+/i, 'د. ')
        .replace(/^eng\.?\s+/i, 'م. ');

      const nameDict: Record<string, string> = {
        'mariem': 'مريم', 'mariam': 'مريم', 'maryam': 'مريم', 'meriam': 'مريم', 'meryem': 'مريم',
        'mohamed': 'محمد', 'mohammad': 'محمد', 'muhammad': 'محمد', 'mohammed': 'محمد', 'mhamed': 'محمد',
        'ahmed': 'أحمد', 'ahmad': 'أحمد', 'mahmoud': 'محمود', 'mahmud': 'محمود',
        'omar': 'عمر', 'omer': 'عمر', 'khaled': 'خالد', 'khalid': 'خالد',
        'youssef': 'يوسف', 'yousef': 'يوسف', 'yusuf': 'يوسف', 'ali': 'علي', 'aly': 'علي',
        'salma': 'سلمى', 'selma': 'سلمى', 'tarek': 'طارق', 'tarik': 'طارق',
        'sarah': 'سارة', 'sara': 'سارة', 'nour': 'نور', 'noor': 'نور',
        'hassan': 'حسن', 'hasan': 'حسن', 'hussein': 'حسين', 'hussien': 'حسين',
        'mostafa': 'مصطفى', 'mustafa': 'مصطفى', 'moustafa': 'مصطفى',
        'karim': 'كريم', 'kareem': 'كريم', 'ibrahim': 'إبراهيم', 'ebrahim': 'إبراهيم',
        'fatma': 'فاطمة', 'fatima': 'فاطمة', 'fatimah': 'فاطمة',
        'aya': 'آية', 'ayah': 'آية', 'nada': 'ندى', 'reem': 'ريم', 'rim': 'ريم',
        'mona': 'منى', 'hossam': 'حسام', 'amr': 'عمرو', 'ziad': 'زياد', 'zeyad': 'زياد',
        'menna': 'منة', 'habiba': 'حبيبة', 'malak': 'ملك', 'shahd': 'شهد', 'jana': 'جنى',
        'farah': 'فرح', 'yara': 'يارا', 'rawan': 'روان', 'nouran': 'نوران', 'dina': 'دينا',
        'yasmin': 'ياسمين', 'yasmine': 'ياسمين', 'alaa': 'علاء', 'samir': 'سمير',
        'sayed': 'سيد', 'said': 'سعيد', 'ashraf': 'أشرف', 'gamal': 'جمال', 'adel': 'عادل',
        'magdy': 'مجدي', 'wael': 'وائل', 'hany': 'هاني', 'sherif': 'شريف', 'ramy': 'رامي',
        'mina': 'مينا', 'peter': 'بيتر', 'george': 'جورج', 'fady': 'فادي', 'kamal': 'كمال',
        'nasser': 'ناصر', 'abdelrahman': 'عبد الرحمن', 'abdullah': 'عبد الله', 'abdelaziz': 'عبد العزيز',
        'osama': 'أسامة', 'eslam': 'إسلام', 'islam': 'إسلام', 'eman': 'إيمان', 'asmaa': 'أسماء',
        'salwa': 'سلوى', 'marwa': 'مروة', 'rania': 'رانيا',
        'mike': 'مايك', 'ross': 'روس', 'jenkins': 'جينكينز', 'sarah jenkins': 'سارة جينكينز',
        'mike ross': 'مايك روس', 'dr. ahmed': 'د. أحمد', 'dr ahmed': 'د. أحمد',
        'eng. ahmed tarek': 'م. أحمد طارق',
        'dr.': 'د.', 'dr': 'د.', 'eng.': 'م.', 'eng': 'م.'
      };

      const lower = trimmed.toLowerCase();
      if (nameDict[lower]) return nameDict[lower];

      const words = trimmed.split(/\s+/);
      return words.map(w => {
        const clean = w.toLowerCase().replace(/[^\w\u0600-\u06FF.]/g, '');
        if (nameDict[clean]) return nameDict[clean];
        const noDot = clean.replace('.', '');
        if (nameDict[noDot]) return nameDict[noDot];
        return w;
      }).join(' ');
    } else {
      trimmed = trimmed
        .replace(/^د\.?\s+/i, 'Dr. ')
        .replace(/^م\.?\s+/i, 'Eng. ');

      const engDict: Record<string, string> = {
        'مريم': 'Mariam', 'محمد': 'Mohamed', 'أحمد': 'Ahmed', 'احمد': 'Ahmed',
        'محمود': 'Mahmoud', 'عمر': 'Omar', 'خالد': 'Khaled', 'يوسف': 'Youssef',
        'علي': 'Ali', 'سلمى': 'Salma', 'طارق': 'Tarek', 'سارة': 'Sarah', 'ساره': 'Sarah',
        'نور': 'Nour', 'حسن': 'Hassan', 'حسين': 'Hussein', 'مصطفى': 'Mostafa',
        'كريم': 'Karim', 'إبراهيم': 'Ibrahim', 'ابراهيم': 'Ibrahim', 'فاطمة': 'Fatma',
        'فاطمه': 'Fatma', 'آية': 'Aya', 'اية': 'Aya', 'ندى': 'Nada', 'ريم': 'Reem',
        'منى': 'Mona', 'حسام': 'Hossam', 'عمرو': 'Amr', 'زياد': 'Ziad', 'منة': 'Menna',
        'حبيبة': 'Habiba', 'ملك': 'Malak', 'شهد': 'Shahd', 'جنى': 'Jana', 'فرح': 'Farah',
        'يارا': 'Yara', 'روان': 'Rawan', 'نوران': 'Nouran', 'دينا': 'Dina', 'ياسمين': 'Yasmine',
        'علاء': 'Alaa', 'سمير': 'Samir', 'سيد': 'Sayed', 'سعيد': 'Said', 'أشرف': 'Ashraf',
        'جمال': 'Gamal', 'عادل': 'Adel', 'مجدي': 'Magdy', 'وائل': 'Wael', 'هاني': 'Hany',
        'شريف': 'Sherif', 'رامي': 'Ramy', 'مينا': 'Mina', 'عبد الرحمن': 'Abdelrahman',
        'عبد الله': 'Abdullah', 'عبد العزيز': 'Abdelaziz', 'أسامة': 'Osama', 'إسلام': 'Islam',
        'إيمان': 'Eman', 'أسماء': 'Asmaa', 'سلوى': 'Salwa', 'مروة': 'Marwa', 'رانيا': 'Rania',
        'مايك': 'Mike', 'روس': 'Ross', 'جينكينز': 'Jenkins',
        'د.': 'Dr.', 'م.': 'Eng.'
      };

      if (engDict[trimmed]) return engDict[trimmed];
      const words = trimmed.split(/\s+/);
      return words.map(w => engDict[w] || w).join(' ');
    }
  }

  formatTimeLocale(timeStr?: string | number): string {
    if (timeStr === undefined || timeStr === null || timeStr === '') return '';
    let str = String(timeStr).trim();
    // Normalize corrupted double markers
    str = str.replace(/\b(AM\s+PM|PM\s+AM|AM\s+AM|PM\s+PM)\b/gi, m => m.toUpperCase().startsWith('P') ? 'PM' : 'AM');
    str = str.replace(/(ص\s+م|م\s+ص|ص\s+ص|م\s+م)/g, m => m.startsWith('م') ? 'م' : 'ص');

    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|ص|م)?/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = match[2];
      let marker = (match[3] || '').toUpperCase();
      if (marker === 'ص') marker = 'AM';
      if (marker === 'م') marker = 'PM';

      if (!marker) {
        marker = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
      } else {
        h = h % 12 || 12;
      }

      const padH = String(h).padStart(2, '0');
      if (this.isArabic()) {
        const arMarker = marker === 'PM' ? 'م' : 'ص';
        return `${padH}:${m} ${arMarker}`;
      } else {
        return `${padH}:${m} ${marker}`;
      }
    }
    return str;
  }

  formatDurationLocale(durStr?: string): string {
    if (!durStr) return this.isArabic() ? '0 س 00 د' : '0h 00m';
    const str = String(durStr).trim();
    if (this.isArabic()) {
      return str
        .replace(/elapsed/gi, '')
        .replace(/session/gi, '')
        .replace(/(\d+)\s*h\s*(\d+)\s*m/gi, '$1 س $2 د')
        .replace(/(\d+)\s*h\b/gi, '$1 س')
        .replace(/(\d+)\s*m\b/gi, '$1 د')
        .replace(/hrs?/gi, 'ساعات')
        .replace(/mins?/gi, 'دقيقة')
        .trim();
    } else {
      return str
        .replace(/(\d+)\s*س\s*(\d+)\s*د/g, '$1h $2m')
        .replace(/(\d+)\s*س\b/g, '$1h')
        .replace(/(\d+)\s*د\b/g, '$1m')
        .trim();
    }
  }

  formatActivityLocale(activity?: string): string {
    if (!activity) return '';
    const trimmed = activity.trim();
    if (this.isArabic()) {
      const actMap: Record<string, string> = {
        'web dev workshop': 'ورشة تطوير الويب',
        'fullstack web dev workshop': 'ورشة تطوير الويب الشامل',
        'ui design lab': 'معمل تصميم الواجهات (UI/UX)',
        'ui/ux design sprint': 'جلسة تصميم واجهات وتجربة مستخدم',
        'photography basics': 'أساسيات التصوير الفوتوغرافي',
        'graduation project discussion': 'مناقشة مشروع التخرج',
        'python for beginners': 'بايثون للمبتدئين',
        'english conversation club': 'نادي المحادثة الإنجليزية',
        'graphic design masterclass': 'دورة التصميم الجرافيكي',
        'flutter mobile dev': 'تطوير تطبيقات فلاتر',
        'general study': 'دراسة ومذاكرة عامة'
      };
      const lower = trimmed.toLowerCase();
      if (actMap[lower]) return actMap[lower];
      return trimmed;
    } else {
      const engActMap: Record<string, string> = {
        'ورشة تطوير الويب': 'Web Dev Workshop',
        'ورشة تطوير الويب الشامل': 'Fullstack Web Dev Workshop',
        'معمل تصميم الواجهات (UI/UX)': 'UI Design Lab',
        'جلسة تصميم واجهات وتجربة مستخدم': 'UI/UX Design Sprint',
        'أساسيات التصوير الفوتوغرافي': 'Photography Basics',
        'مناقشة مشروع التخرج': 'Graduation Project Discussion'
      };
      if (engActMap[trimmed]) return engActMap[trimmed];
      return trimmed;
    }
  }

  formatRoomLocale(room?: string): string {
    if (!room) return '';
    const trimmed = room.trim();
    if (this.isArabic()) {
      const roomMap: Record<string, string> = {
        'hall a (main classroom)': 'قاعة أ (القاعة الرئيسية)',
        'hall a': 'قاعة أ',
        'hall b': 'قاعة ب',
        'hall c': 'قاعة ج',
        'meeting room 1': 'غرفة اجتماعات 1',
        'meeting room 2': 'غرفة اجتماعات 2',
        'meeting room 3': 'غرفة اجتماعات 3',
        'meeting room': 'غرفة اجتماعات',
        'workshop hall': 'قاعة ورش العمل',
        'classroom 1': 'قاعة دراسية 1',
        'classroom 2': 'قاعة دراسية 2',
        'classroom 3': 'قاعة دراسية 3',
        'quiet zone': 'منطقة الهدوء والتركيز',
        'collaborative lounge': 'مساحة العمل المشتركة',
        'phone booth': 'كابينة الاتصال'
      };
      const lower = trimmed.toLowerCase();
      if (roomMap[lower]) return roomMap[lower];
      return trimmed;
    } else {
      const engRoomMap: Record<string, string> = {
        'قاعة أ (القاعة الرئيسية)': 'Hall A (Main Classroom)',
        'قاعة أ': 'Hall A',
        'قاعة ب': 'Hall B',
        'قاعة ج': 'Hall C',
        'غرفة اجتماعات 1': 'Meeting Room 1',
        'غرفة اجتماعات 2': 'Meeting Room 2',
        'غرفة اجتماعات 3': 'Meeting Room 3',
        'قاعة ورش العمل': 'Workshop Hall',
        'قاعة دراسية 1': 'Classroom 1',
        'قاعة دراسية 2': 'Classroom 2'
      };
      if (engRoomMap[trimmed]) return engRoomMap[trimmed];
      return trimmed;
    }
  }

  formatDateLocale(dateStr?: string): string {
    if (!dateStr) return '';
    const trimmed = dateStr.trim();
    if (!trimmed || trimmed.toUpperCase() === 'N/A' || trimmed === '-') {
      return this.isArabic() ? 'غير محدد' : 'N/A';
    }

    if (this.isArabic()) {
      if (trimmed.toLowerCase() === 'today') return 'اليوم';
      if (trimmed.toLowerCase() === 'yesterday') return 'أمس';
      if (trimmed.toLowerCase() === 'tomorrow') return 'غداً';

      const monthsAr: Record<string, string> = {
        jan: 'يناير', january: 'يناير',
        feb: 'فبراير', february: 'فبراير',
        mar: 'مارس', march: 'مارس',
        apr: 'أبريل', april: 'أبريل',
        may: 'مايو',
        jun: 'يونيو', june: 'يونيو',
        jul: 'يوليو', july: 'يوليو',
        aug: 'أغسطس', august: 'أغسطس',
        sep: 'سبتمبر', september: 'سبتمبر',
        oct: 'أكتوبر', october: 'أكتوبر',
        nov: 'نوفمبر', november: 'نوفمبر',
        dec: 'ديسمبر', december: 'ديسمبر'
      };

      // Match format like "Oct 15, 2026" or "Sep 01, 2026"
      const m1 = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?$/);
      if (m1) {
        const monthKey = m1[1].toLowerCase();
        const day = m1[2];
        const year = m1[3] || '';
        const monthName = monthsAr[monthKey] || m1[1];
        return `${day} ${monthName} ${year}`.trim();
      }

      const m2 = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)(?:,?\s*(\d{4}))?$/);
      if (m2) {
        const day = m2[1];
        const monthKey = m2[2].toLowerCase();
        const year = m2[3] || '';
        const monthName = monthsAr[monthKey] || m2[2];
        return `${day} ${monthName} ${year}`.trim();
      }

      // Match YYYY-MM-DD
      const m3 = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m3) {
        const monthIdx = parseInt(m3[2], 10) - 1;
        const monthNamesList = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const monthName = monthNamesList[monthIdx] || m3[2];
        return `${m3[3]} ${monthName} ${m3[1]}`;
      }

      return trimmed;
    } else {
      if (trimmed === 'اليوم') return 'Today';
      if (trimmed === 'أمس') return 'Yesterday';
      if (trimmed === 'غداً') return 'Tomorrow';
      if (trimmed === 'غير محدد' || trimmed === 'لا ينطبق') return 'N/A';
      return trimmed;
    }
  }
}
