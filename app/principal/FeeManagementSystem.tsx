import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/Feather';
import * as XLSX from 'xlsx'; // <-- FIXED


type FeeManagementSystemProps = {};

export default function FeeManagementSystem({ }: FeeManagementSystemProps) {
  const [activeTab, setActiveTab] = useState('feecollection');
  const [schoolId, setSchoolId] = useState(null);
  const [classes, setSchoolClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fee Management State
  const [feeManagement, setFeeManagement] = useState<FeeManagementItem[]>([]);
  const [feeCollection, setFeeCollection] = useState<FeeCollectionItem[]>([]);
  const [schoolFee, setSchoolFee] = useState<SchoolFeeItem[]>([]);

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('create');
  const [selectedItem, setSelectedItem] = useState<FeeManagementItem | FeeCollectionItem | SchoolFeeItem | null>(null);

  // Form States
  interface FormDataType {
    schoolId?: string | number | null;
    className?: string;
    section?: string;
    feeType?: string[] | string;
    amount?: number | string;
    dueDate?: string;
    description?: string;
    paidDate?: string;
    receiptNumber?: string;
    studentId?: number;
    paymentMode?: string;
    academicYear?: string;
    feeStructure?: string;
    installments?: number;
    lateFeeCharge?: number;
    [key: string]: any;
  }
  const [formData, setFormData] = useState<FormDataType>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');

  // Student search
  const [studentSearch, setStudentSearch] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState<Student[]>([]);
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);

  // Print Modal States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printData, setPrintData] = useState<FeeCollectionItem | null>(null);
  const [schoolLogo, setSchoolLogo] = useState<string | null>(null);
  const [principalSignature, setPrincipalSignature] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState('');

  // Success modal
  const [showFeeCollectionSuccessModal, setShowFeeCollectionSuccessModal] = useState(false);

  // Date range state for filtering
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  // Initialize school data
  useEffect(() => {
    const fetchData = async () => {
      const userRaw = await AsyncStorage.getItem('principal_user');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const schools = user?.principal_user?.schools || user?.schools || [];
      setSchoolName(
        schools[0]?.Schoolname || schools[0]?.schoolName || 'School Name'
      );
      const schoolId = schools[0]?.id || null;
      setSchoolId(schoolId);

      if (schoolId) {
        fetchClasses(schoolId);
        fetchStudents(schoolId);
        fetchAllFeeData(schoolId);
        fetchSchoolAssets(schoolId);
      }
    };

    fetchData();
  }, []);

  interface SchoolAssetsResponse {
    schoolLogo?: string | null;
    principalSignature?: string | null;
    [key: string]: any;
  }

  const fetchSchoolAssets = async (schoolId: string | number): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/newSchool/school-assets/by-school/${schoolId}`,
        headers
      );
      const data: SchoolAssetsResponse = await response.json();
      if (data) {
        setSchoolLogo(data.schoolLogo || null);
        setPrincipalSignature(data.principalSignature || null);
      }
    } catch (error) {
      console.error('Error fetching school assets:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch school assets',
      });
    }
  };

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('principal_token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
  };

  interface SchoolClass {
    id: number;
    name: string;
    [key: string]: any;
  }

  interface FetchClassesResponse {
    success: boolean;
    classes: SchoolClass[];
    [key: string]: any;
  }

  const fetchClasses = async (schoolId: string | number): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/classes/${schoolId}`,
        headers
      );
      const data: FetchClassesResponse = await response.json();
      if (data.success) {
        setSchoolClasses(data.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch classes',
      });
    }
  };

  interface Student {
    id: number;
    studentName: string;
    Admission_Number: string;
    class_?: string;
    class?: string;
    sectionclass?: string;
    section?: string;
    [key: string]: any;
  }

  interface FetchStudentsResponse {
    success: boolean;
    students: Student[];
    [key: string]: any;
  }

  const fetchStudents = async (schoolId: string | number): Promise<void> => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/admission/students/by-school/${schoolId}`,
        headers
      );
      const data: FetchStudentsResponse = await response.json();
      if (data.success) {
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch students',
      });
    }
  };

  interface FeeManagementItem {
    id: number;
    feeType: string;
    className: string;
    section: string;
    amount: number;
    dueDate: string;
    description?: string;
    [key: string]: any;
  }

  interface FeeCollectionItem {
    id: number;
    studentId: number;
    feeType: string[] | string;
    amount: number;
    paymentMode: string;
    paidDate: string;
    receiptNumber: string;
    description?: string;
    [key: string]: any;
  }

  interface SchoolFeeItem {
    id: number;
    academicYear?: string;
    feeStructure?: string;
    installments?: number;
    lateFeeCharge?: number;
    classfee?: Record<string, number>;
    className?: string;
    feeType?: string;
    amount?: number;
    description?: string;
    [key: string]: any;
  }

  const fetchAllFeeData = async (
    schoolId: string | number
  ): Promise<void> => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const [feeManagementRes, feeCollectionRes, schoolFeeRes] =
        await Promise.all([
          fetch(
            `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/fees/feemanagement?schoolId=${schoolId}`,
            headers
          ),
          fetch(
            `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/fees/feecollection?schoolId=${schoolId}`,
            headers
          ),
          fetch(
            `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/fees/schoolfee?schoolId=${schoolId}`,
            headers
          ),
        ]);

      const [
        feeManagementData,
        feeCollectionData,
        schoolFeeData,
      ]: [
          { success: boolean; fees: FeeManagementItem[] },
          { success: boolean; fees: FeeCollectionItem[] },
          { success: boolean; fees: SchoolFeeItem[] }
        ] = await Promise.all([
          feeManagementRes.json(),
          feeCollectionRes.json(),
          schoolFeeRes.json(),
        ]);

      if (feeManagementData.success)
        setFeeManagement(feeManagementData.fees || []);
      if (feeCollectionData.success)
        setFeeCollection(feeCollectionData.fees || []);
      if (schoolFeeData.success) setSchoolFee(schoolFeeData.fees || []);
    } catch (error) {
      console.error('Error fetching fee data:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to fetch fee data',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (schoolId) fetchAllFeeData(schoolId);
  };

  const handleCreate = () => {
    setModalType('create');
    setSelectedItem(null);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setFormData({
      schoolId: schoolId,
      className: '',
      section: '',
      feeType: [],
      amount: '',
      dueDate: '',
      description: '',
      ...(activeTab === 'feecollection' && {
        paidDate: todayStr,
        receiptNumber: generateReceiptNumber(),
      }),
    });
    setShowModal(true);
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `REC-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
  };

  const handleEdit = (item: FeeManagementItem | FeeCollectionItem | SchoolFeeItem) => {
    setModalType('edit');
    setSelectedItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleView = (item: FeeManagementItem | FeeCollectionItem | SchoolFeeItem) => {
    setModalType('view');
    setSelectedItem(item);
    setFormData(item);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this record?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              const response = await fetch(
                `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/fees/${activeTab}/${id}`,
                {
                  method: 'DELETE',
                  ...headers,
                }
              );

              if (response.ok) {
                if (schoolId) fetchAllFeeData(schoolId);
                Toast.show({
                  type: 'success',
                  text1: 'Success',
                  text2: 'Record deleted successfully!',
                });
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Error',
                  text2: 'Error deleting record',
                });
              }
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Error deleting record',
              });
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSubmit = async (_event?: any) => {
    let payload = { ...formData };

    if (activeTab === 'feecollection') {
      const selectedStudent = students.find((s: Student) => s.id === formData.studentId);
      if (selectedStudent) {
        payload.className =
          selectedStudent.class_ || selectedStudent.class || '';
        payload.section =
          selectedStudent.sectionclass || selectedStudent.section || '';
      }
      payload.feeType = Array.isArray(payload.feeType)
        ? payload.feeType.filter((v): v is string => typeof v === 'string')
        : [payload.feeType].filter((v): v is string => typeof v === 'string');
    }

    try {
      const url =
        modalType === 'create'
          ? `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/fees/${activeTab}`
          : `https://1rzlgxk8-5001.inc1.devtunnels.ms/api/fees/${activeTab}/${selectedItem?.id}`;

      const method = modalType === 'create' ? 'POST' : 'PUT';
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method,
        ...headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        if (schoolId) fetchAllFeeData(schoolId);
        setShowModal(false);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Record ${modalType === 'create' ? 'created' : 'updated'} successfully!`,
        });

        if (activeTab === 'feecollection' && modalType === 'create') {
          const responseData = await response.json();
          setPrintData({
            ...payload,
            id: responseData.id || new Date().getTime(),
            studentId: typeof payload.studentId === 'number' ? payload.studentId : 0, // fallback or handle appropriately
            feeType: Array.isArray(payload.feeType)
              ? payload.feeType
              : typeof payload.feeType === 'string'
                ? payload.feeType
                : '', // fallback to empty string if undefined
            amount: typeof payload.amount === 'number' ? payload.amount : Number(payload.amount) || 0,
            paymentMode: typeof payload.paymentMode === 'string' ? payload.paymentMode : '',
            paidDate: typeof payload.paidDate === 'string' ? payload.paidDate : '',
            receiptNumber: typeof payload.receiptNumber === 'string' ? payload.receiptNumber : '',
          });
          setShowFeeCollectionSuccessModal(true);
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: `Error ${modalType === 'create' ? 'creating' : 'updating'} record`,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Error saving record',
      });
    }
  };

  const handlePrintReceipt = async () => {
    if (!printData) {
      Alert.alert('Error', 'No receipt data available to print.');
      return;
    }
    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; margin: 20px; }
            .receipt-container { border: 1px solid #ccc; padding: 20px; max-width: 600px; margin: auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .header img { max-height: 80px; margin-bottom: 10px; }
            .header h2 { margin: 0; font-size: 24px; }
            .header p { margin: 0; font-size: 14px; color: #555; }
            .details p { margin: 5px 0; }
            .details strong { width: 120px; display: inline-block; }
            .fee-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .fee-table th, .fee-table td { border: 1px solid #eee; padding: 8px; text-align: left; }
            .fee-table th { background-color: #f2f2f2; }
            .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
            .signature { margin-top: 40px; text-align: right; }
            .signature img { max-height: 60px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="header">
              <h2>${schoolName}</h2>
              <p>Fee Receipt</p>
            </div>
            <div class="details">
              <p><strong>Receipt No:</strong> ${printData.receiptNumber}</p>
              <p><strong>Date:</strong> ${new Date(printData.paidDate).toLocaleDateString()}</p>
              <p><strong>Student Name:</strong> ${students.find((s: Student) => s.id === printData.studentId)?.studentName || 'N/A'}</p>
              <p><strong>Admission No:</strong> ${students.find((s: Student) => s.id === printData.studentId)?.Admission_Number || 'N/A'}</p>
              <p><strong>Class:</strong> ${printData.className || students.find((s: Student) => s.id === printData.studentId)?.class_ || 'N/A'}</p>
              <p><strong>Section:</strong> ${printData.section || students.find((s: Student) => s.id === printData.studentId)?.sectionclass || 'N/A'}</p>
            </div>
            <table class="fee-table">
              <thead>
                <tr>
                  <th>Fee Type</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${Array.isArray(printData.feeType) ? printData.feeType.join(', ') : printData.feeType}</td>
                  <td>₹${printData.amount}</td>
                </tr>
              </tbody>
            </table>
            <div class="total">Total Paid: ₹${printData.amount}</div>
            <div class="payment-method">
              <p><strong>Payment Method:</strong> ${printData.paymentMode}</p>
              ${printData.description ? `<p><strong>Description:</strong> ${printData.description}</p>` : ''}
            </div>
            <div class="signature">
              <p class="font-semibold">Principal Signature</p>
            </div>
            <div class="footer">Thank you for your payment.</div>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      // Share the PDF
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
      console.error(error);
    }
  };

  const handleDownloadExcel = async () => {
    const filteredFeeCollection = feeCollection.filter((item) => {
      if (!dateRange.from && !dateRange.to) return true;
      const payDate = new Date(item.paidDate);
      const from = dateRange.from ? new Date(dateRange.from) : null;
      const to = dateRange.to ? new Date(dateRange.to) : null;
      if (from && payDate < from) return false;
      if (to && payDate > to) return false;
      return true;
    });

    const ws = XLSX.utils.json_to_sheet(filteredFeeCollection);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FeeCollection');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const path = `${FileSystem.documentDirectory}fee-collection-summary.xlsx`;

    try {
      await FileSystem.writeAsStringAsync(path, wbout, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert(
        'Success',
        `Excel file saved to ${path}`,
        [
          {
            text: 'Open',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openURL(`file://${path}`);
              } else {
                // iOS requires more complex handling
                console.log('File saved:', path);
              }
            },
          },
          { text: 'OK', onPress: () => { } },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save Excel file');
      console.error(error);
    }
  };

  const getFormFields = () => {
    const baseFields = [
      {
        name: 'className',
        label: 'Class',
        type: 'select',
        options: classes.map((c) => ({ value: c.name, label: c.name })),
      },
      {
        name: 'section',
        label: 'Section',
        type: 'select',
        options: [
          { value: 'A', label: 'A' },
          { value: 'B', label: 'B' },
          { value: 'C', label: 'C' },
          { value: 'D', label: 'D' },
        ],
      },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'dueDate', label: 'Due Date', type: 'date' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ];

    switch (activeTab) {
      case 'feemanagement':
        return [
          {
            name: 'feeType',
            label: 'Fee Type',
            type: 'select',
            options: [
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'half-yearly', label: 'Half Yearly' },
              { value: 'annually', label: 'Annually' },
              { value: 'Q-exam', label: 'Quarterly Exam Fee' },
              { value: 'H-exam', label: 'Half-Exam Fee' },
              { value: 'annual-exam', label: 'Annual Exam Fee' },
              { value: 'tuition', label: 'Tuition Fee' },
              { value: 'old-admission', label: 'Old Admission Fee' },
              { value: 'New-admission', label: 'New Admission Fee' },
              { value: 'transport', label: 'Transport Fee' },
              { value: 'library', label: 'Library Fee' },
              { value: 'sports', label: 'Sports Fee' },
              { value: 'other', label: 'Other' },
            ],
          },
          ...baseFields,
        ];
      case 'feecollection':
        return [
          {
            name: 'studentId',
            label: 'Student',
            type: 'studentSearch',
            options: students.map((s) => ({
              value: s.id,
              label: `${s.studentName} (${s.Admission_Number})`,
            })),
          },
          {
            name: 'feeType',
            label: 'Fee Type',
            type: 'checkboxGroup',
            options: getAvailableFeeTypes(formData),
          },
          {
            name: 'paymentMode',
            label: 'Payment Method',
            type: 'select',
            options: [
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'upi', label: 'UPI' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'cheque', label: 'Cheque' },
            ],
          },
          { name: 'paidDate', label: 'Payment Date', type: 'date' },
          { name: 'amount', label: 'Amount', type: 'number', readOnly: true },
          { name: 'description', label: 'Description', type: 'textarea' },
        ];
      case 'schoolfee':
        return [
          { name: 'academicYear', label: 'Academic Year', type: 'text' },
          { name: 'feeStructure', label: 'Fee Structure', type: 'textarea' },
          {
            name: 'installments',
            label: 'Number of Installments',
            type: 'number',
          },
          { name: 'lateFeeCharge', label: 'Late Fee Charge', type: 'number' },
          ...baseFields,
        ];
      default:
        return baseFields;
    }
  };

  interface FormFieldOption {
    value: string | number;
    label: string;
  }

  interface FormField {
    name: string;
    label: string;
    type: string;
    options?: FormFieldOption[];
    readOnly?: boolean;
  }

  interface RenderFormFieldProps {
    field: FormField;
  }
  // Date picker state for all date fields
  const [datePickerState, setDatePickerState] = useState<{
    show: boolean;
    fieldName: string;
    value: Date;
  }>({ show: false, fieldName: '', value: new Date() });

  const renderFormField = (field: FormField): React.ReactNode => {
    if (activeTab === 'feecollection' && field.name === 'studentId') {
      const selectedStudent = students.find((s: Student) => s.id === formData.studentId);
      return (
        <View style={styles.formField}>
          <Text style={styles.label}>{field.label}</Text>
          <TextInput
            placeholder="Search by Admission Number or Name"
            value={studentSearch}
            onChangeText={(val: string) => {
              setStudentSearch(val);
              if (val.length > 0) {
                const filtered = students.filter(
                  (s) =>
                    s.Admission_Number?.toLowerCase().includes(
                      val.toLowerCase()
                    ) ||
                    s.studentName?.toLowerCase().includes(val.toLowerCase())
                );
                setStudentSearchResults(filtered);
                setStudentDropdownOpen(true);
              } else {
                setStudentSearchResults([]);
                setStudentDropdownOpen(false);
              }
            }}
            style={styles.input}
            editable={modalType !== 'view'}
          />
          {studentDropdownOpen && studentSearchResults.length > 0 && (
            <View style={styles.dropdown}>
              <FlatList
                data={studentSearchResults}
                keyExtractor={(item: Student) => item.id.toString()}
                renderItem={({ item }: { item: Student }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setFormData({ ...formData, studentId: item.id });
                      setStudentSearch(
                        `${item.studentName} (${item.Admission_Number})`
                      );
                      setStudentDropdownOpen(false);
                    }}
                  >
                    <Text>
                      {item.studentName} ({item.Admission_Number})
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
          {selectedStudent && (
            <View style={styles.studentInfo}>
              <Text style={styles.studentInfoText}>
                Class: {selectedStudent.class_ || selectedStudent.class || '-'}
              </Text>
              <Text style={styles.studentInfoText}>
                Section:{' '}
                {selectedStudent.sectionclass || selectedStudent.section || '-'}
              </Text>
            </View>
          )}
        </View>
      );
    }

    if (field.type === 'checkboxGroup') {
      const selected: string[] = Array.isArray(formData[field.name])
        ? formData[field.name]
        : [];
      return (
        <View style={styles.formField}>
          <Text style={styles.label}>{field.label}</Text>
          <View style={styles.checkboxContainer}>
            {field.options?.map((option) => (
              <View key={option.value} style={styles.checkboxWrapper}>
                <TouchableOpacity
                  style={[
                    styles.checkbox,
                    selected.includes(String(option.value)) && styles.checkboxChecked,
                  ]}
                  onPress={() => {
                    let updated: string[];
                    if (selected.includes(String(option.value))) {
                      updated = selected.filter((v) => v !== String(option.value));
                    } else {
                      updated = [...selected, String(option.value)];
                    }
                    setFormData({ ...formData, [field.name]: updated });
                  }}
                  disabled={modalType === 'view'}
                >
                  {selected.includes(String(option.value)) && (
                    <Icon name="check" size={16} color="white" />
                  )}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>{option.label}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    switch (field.type) {
      case 'select':
        return (
          <View style={styles.formField}>
            <Text style={styles.label}>{field.label}</Text>
            <View style={styles.selectContainer}>
              <Picker
                selectedValue={formData[field.name] || ''}
                onValueChange={(value: string | number) =>
                  setFormData({ ...formData, [field.name]: value })
                }
                style={styles.select}
                enabled={modalType !== 'view'}
              >
                <Picker.Item label={`Select ${field.label}`} value="" />
                {field.options?.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </Picker>
            </View>
          </View>
        );
      case 'textarea':
        return (
          <View style={styles.formField}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              value={formData[field.name] || ''}
              onChangeText={(text: string) =>
                setFormData({ ...formData, [field.name]: text })
              }
              style={[
                styles.input,
                field.type === 'textarea' && styles.textarea,
              ]}
              editable={modalType !== 'view'}
              multiline={field.type === 'textarea'}
            />
          </View>
        );
      case 'date':
        return (
          <View style={styles.formField}>
            <Text style={styles.label}>{field.label}</Text>
            <TouchableOpacity
              onPress={() => {
                if (modalType === 'view') return;
                setDatePickerState({
                  show: true,
                  fieldName: field.name,
                  value: formData[field.name] ? new Date(formData[field.name]) : new Date(),
                });
              }}
            >
              <TextInput
                value={formData[field.name] || ''}
                placeholder="Select date"
                style={styles.input}
                editable={false}
              />
            </TouchableOpacity>
            {datePickerState.show && datePickerState.fieldName === field.name && (
              <DateTimePicker
                value={datePickerState.value}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (event.type === 'set' && date) {
                    const formattedDate = date.toISOString().split('T')[0];
                    setFormData({ ...formData, [field.name]: formattedDate });
                  }
                  setDatePickerState({ show: false, fieldName: '', value: new Date() });
                }}
              />
            )}
          </View>
        );
      case 'number':
        return (
          <View style={styles.formField}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              value={formData[field.name]?.toString() || ''}
              onChangeText={(text: string) =>
                setFormData({ ...formData, [field.name]: text.replace(/[^0-9]/g, '') })
              }
              style={styles.input}
              keyboardType="numeric"
              editable={modalType !== 'view' && !field.readOnly}
            />
          </View>
        );
      default:
        return (
          <View style={styles.formField}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              value={formData[field.name] || ''}
              onChangeText={(text: string) =>
                setFormData({ ...formData, [field.name]: text })
              }
              style={styles.input}
              editable={modalType !== 'view'}
            />
          </View>
        );
    }
  };

  // Helper to flatten schoolFee/classfee for FlatList
  const flattenSchoolFeeData = (schoolFeeArr: SchoolFeeItem[]) => {
    const flat: any[] = [];
    schoolFeeArr.forEach((item) => {
      if (item.classfee && typeof item.classfee === 'object') {
        Object.entries(item.classfee).forEach(([className, amount]) => {
          flat.push({
            ...item,
            id: `${item.id}-${className}`,
            className,
            amount,
          });
        });
      } else {
        flat.push(item);
      }
    });
    return flat;
  };

  const getCurrentData = () => {
    switch (activeTab) {
      case 'feemanagement':
        return feeManagement;
      case 'feecollection':
        return feeCollection;
      case 'schoolfee':
        return flattenSchoolFeeData(schoolFee);
      default:
        return [];
    }
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    return data.filter((item) => {
      const matchesSearch = Object.values(item).some((value) =>
        value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesClass = !filterClass || item.className === filterClass;
      return matchesSearch && matchesClass;
    });
  };

  const renderTableItem = ({ item }: { item: FeeManagementItem | FeeCollectionItem | SchoolFeeItem }) => {
    const student = students.find((s) => s.id === item.studentId);

    return (
      <View style={styles.card}>
        {activeTab === 'feemanagement' && (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.feeType}</Text>
              <Text style={styles.cardAmount}>₹{item.amount}</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Class:</Text>
                <Text style={styles.cardValue}>{item.className}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Section:</Text>
                <Text style={styles.cardValue}>{item.section}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Due Date:</Text>
                <Text style={styles.cardValue}>{new Date(item.dueDate).toLocaleDateString()}</Text>
              </View>
              {item.description && (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Description:</Text>
                  <Text style={styles.cardValue} numberOfLines={2}>{item.description}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleView(item)} style={styles.actionButton}>
                <Icon name="eye" size={18} color="#666" />
                <Text style={styles.actionText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                <Icon name="edit" size={18} color="#000" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionButton, styles.deleteButton]}>
                <Icon name="trash-2" size={18} color="#dc2626" />
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'feecollection' && (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {student ? student.studentName : 'Unknown Student'}
              </Text>
              <Text style={styles.cardAmount}>₹{item.amount}</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Admission No:</Text>
                <Text style={styles.cardValue}>{student ? student.Admission_Number : 'N/A'}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Fee Type:</Text>
                <Text style={styles.cardValue}>
                  {Array.isArray(item.feeType) ? item.feeType.join(', ') : item.feeType}
                </Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Payment Mode:</Text>
                <Text style={styles.cardValue}>{item.paymentMode}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Payment Date:</Text>
                <Text style={styles.cardValue}>{new Date(item.paidDate).toLocaleDateString()}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Receipt No:</Text>
                <Text style={styles.cardValue}>{item.receiptNumber}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleView(item)} style={styles.actionButton}>
                <Icon name="eye" size={18} color="#666" />
                <Text style={styles.actionText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                <Icon name="edit" size={18} color="#000" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionButton, styles.deleteButton]}>
                <Icon name="trash-2" size={18} color="#dc2626" />
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {activeTab === 'schoolfee' && (
          <>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.className}</Text>
              <Text style={styles.cardAmount}>₹{item.amount}</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Fee Structure:</Text>
                <Text style={styles.cardValue}>{item.feeStructure || item.feeType}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Installments:</Text>
                <Text style={styles.cardValue}>{item.installments}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Late Fee:</Text>
                <Text style={styles.cardValue}>₹{item.lateFeeCharge}</Text>
              </View>
              {item.description && (
                <View style={styles.cardRow}>
                  <Text style={styles.cardLabel}>Description:</Text>
                  <Text style={styles.cardValue} numberOfLines={2}>{item.description}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => handleView(item)} style={styles.actionButton}>
                <Icon name="eye" size={18} color="#666" />
                <Text style={styles.actionText}>View</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionButton}>
                <Icon name="edit" size={18} color="#000" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={[styles.actionButton, styles.deleteButton]}>
                <Icon name="trash-2" size={18} color="#dc2626" />
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    );
  };

  const filteredData = getFilteredData();

  useEffect(() => {
    if (
      activeTab === 'feecollection' &&
      Array.isArray(formData.feeType) &&
      formData.feeType.length > 0 &&
      formData.studentId
    ) {
      const student = students.find((s: Student) => s.id === formData.studentId);
      if (!student) return;

      const matchingFees = feeManagement.filter(
        (f) =>
          (f.className === student.class_ || f.className === student.class) &&
          (f.section === student.sectionclass ||
            f.section === student.section) &&
          Array.isArray(formData.feeType) && formData.feeType.includes(f.feeType)
      );

      const total = matchingFees.reduce(
        (sum, f) => sum + Number(f.amount || 0),
        0
      );

      if (formData.amount !== total) {
        setFormData((prev) => ({ ...prev, amount: total }));
      }
    } else if (
      activeTab === 'feecollection' &&
      formData.amount !== 0 &&
      (!Array.isArray(formData.feeType) || formData.feeType.length === 0)
    ) {
      const student = students.find((s: Student) => s.id === formData.studentId);
      if (!student) return;

      const matchingFee = feeManagement.find(
        (f) =>
          (f.className === student.class_ || f.className === student.class) &&
          (f.section === student.sectionclass ||
            f.section === student.section) &&
          f.feeType === formData.feeType
      );

      if (matchingFee && formData.amount !== matchingFee.amount) {
        setFormData((prev) => ({ ...prev, amount: matchingFee.amount }));
      }
    }
  }, [formData.feeType, formData.studentId]);

  const getAvailableFeeTypes = (formData: FormDataType) => {
    const selectedClass = formData.className;
    const selectedSection = formData.section;

    if (!selectedClass || !selectedSection) {
      return [];
    }

    const classFee = schoolFee.find(
      (fee) => fee.className === selectedClass && fee.section === selectedSection
    );

    if (classFee && classFee.feeType) {
      return Array.isArray(classFee.feeType)
        ? classFee.feeType.map((type) => ({ value: type, label: type }))
        : [{ value: classFee.feeType, label: classFee.feeType }];
    }

    return [];
  };

  return (
    <View style={styles.container}>
      {/* Fee Collection Success Modal */}
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Fee Management System</Text>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'feemanagement' && styles.activeTab]}
            onPress={() => setActiveTab('feemanagement')}
          >
            <Text style={[styles.tabText, activeTab === 'feemanagement' && styles.activeTabText]}>
              Fee          Management
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'feecollection' && styles.activeTab]}
            onPress={() => setActiveTab('feecollection')}
          >
            <Text style={[styles.tabText, activeTab === 'feecollection' && styles.activeTabText]}>
              Fee Collection
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'schoolfee' && styles.activeTab]}
            onPress={() => setActiveTab('schoolfee')}
          >
            <Text style={[styles.tabText, activeTab === 'schoolfee' && styles.activeTabText]}>
              School Fee
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter Section */}
      <View style={styles.controlsSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              placeholder="Search records..."
              value={searchTerm}
              onChangeText={setSearchTerm}
              style={styles.searchInput}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Filter by Class:</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={filterClass}
                onValueChange={(value) => setFilterClass(value)}
                style={styles.picker}
              >
                <Picker.Item label="All Classes" value="" />
                {classes.map((c) => (
                  <Picker.Item key={c.id} label={c.name} value={c.name} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleCreate}>
          <Icon name="plus" size={20} color="#fff" />
          <Text style={styles.addButtonText}>
            Add {activeTab === 'feemanagement' ? 'Fee' : activeTab === 'feecollection' ? 'Collection' : 'School Fee'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Data Section */}
      <View style={styles.dataSection}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredData}
            keyExtractor={(item) => {
              if (activeTab === 'schoolfee') {
                return String(item.id);
              }
              return item.id ? String(item.id) : Math.random().toString(36).slice(2);
            }}
            renderItem={renderTableItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Icon name="inbox" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No records found</Text>
                <Text style={styles.emptySubText}>Try adjusting your search or filters</Text>
              </View>
            }
            contentContainerStyle={filteredData.length === 0 ? styles.emptyList : styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modals remain the same */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {modalType === 'create' ? 'Add' : modalType === 'edit' ? 'Edit' : 'View'} {' '}
              {activeTab === 'feemanagement' ? 'Fee Management' :
                activeTab === 'feecollection' ? 'Fee Collection' : 'School Fee'}
            </Text>
            <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeButton}>
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {getFormFields().map((field) => (
              <View key={field.name}>
                {renderFormField(field)}
              </View>
            ))}
            {modalType !== 'view' && (
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitButtonText}>
                  {modalType === 'create' ? 'Create' : 'Update'}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Other modals remain unchanged */}
      <Modal visible={showPrintModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Print Receipt</Text>
            <TouchableOpacity onPress={() => setShowPrintModal(false)} style={styles.closeButton}>
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <Text style={styles.printModalText}>
              Receipt for{' '}
              {printData && students.find((s: Student) => s.id === printData.studentId)?.studentName}
            </Text>
            <View style={styles.printDetails}>
              <Text style={styles.printLabel}>Receipt No:</Text>
              <Text style={styles.printValue}>{printData ? printData.receiptNumber : ''}</Text>
            </View>
            <View style={styles.printDetails}>
              <Text style={styles.printLabel}>Date:</Text>
              <Text style={styles.printValue}>
                {printData ? new Date(printData.paidDate).toLocaleDateString() : ''}
              </Text>
            </View>
            <View style={styles.printDetails}>
              <Text style={styles.printLabel}>Class:</Text>
              <Text style={styles.printValue}>
                {printData && (printData.className ||
                  students.find((s: Student) => s.id === printData.studentId)?.class_)}
              </Text>
            </View>
            <View style={styles.printDetails}>
              <Text style={styles.printLabel}>Section:</Text>
              <Text style={styles.printValue}>
                {printData && (printData.section ||
                  students.find((s: Student) => s.id === printData.studentId)
                    ?.sectionclass)}
              </Text>
            </View>
            <View style={styles.printDetails}>
              <Text style={styles.printLabel}>Fee Type:</Text>
              <Text style={styles.printValue}>
                {printData && Array.isArray(printData.feeType)
                  ? printData.feeType.join(', ')
                  : printData?.feeType || ''}
              </Text>
            </View>
            <View style={styles.printDetails}>
              <Text style={styles.printLabel}>Amount:</Text>
              <Text style={styles.printValue}>₹{printData ? printData.amount : ''}</Text>
            </View>
            <View style={styles.printDetails}>
              <Text style={styles.printLabel}>Payment Method:</Text>
              <Text style={styles.printValue}>{printData ? printData.paymentMode : ''}</Text>
            </View>
            {printData && printData.description && (
              <View style={styles.printDetails}>
                <Text style={styles.printLabel}>Description:</Text>
                <Text style={styles.printValue}>{printData.description}</Text>
              </View>
            )}
            <View style={styles.signatureContainer}>
              <Text style={styles.signatureLabel}>Principal Signature</Text>
              {principalSignature && (
                <Image
                  source={{ uri: principalSignature }}
                  style={styles.signatureImage}
                />
              )}
            </View>
            <TouchableOpacity style={styles.printButton} onPress={handlePrintReceipt}>
              <Text style={styles.printButtonText}>Download Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showFeeCollectionSuccessModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Success</Text>
            <TouchableOpacity onPress={() => setShowFeeCollectionSuccessModal(false)} style={styles.closeButton}>
              <Icon name="x" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={64} color="#10b981" />
              <Text style={styles.successMessage}>
                Fee collection record created successfully!
              </Text>
              <TouchableOpacity
                style={styles.successButton}
                onPress={() => setShowFeeCollectionSuccessModal(false)}
              >
                <Text style={styles.successButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Header Styles
  header: {
    backgroundColor: '#fff',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
  },

  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Controls Section
  controlsSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  // Search Styles
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },

  // Filter Styles
  filterContainer: {
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginRight: 12,
    minWidth: 100,
  },
  pickerContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
  },
  picker: {
    height: 50,
    color: '#000',
  },

  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Data Section
  dataSection: {
    flex: 1,
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },

  // List Content
  listContent: {
    paddingBottom: 20,
  },

  // Card Styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    marginRight: 12,
  },
  cardAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#059669',
  },
  cardBody: {
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    minWidth: 100,
    marginRight: 12,
  },
  cardValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
    fontWeight: '400',
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginLeft: 6,
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  deleteText: {
    color: '#dc2626',
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  // Form Styles
  formField: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#000',
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  selectContainer: {
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    height: 48,
    justifyContent: 'center',
  },
  select: {
    height: 48,
    color: '#000',
  },

  // Student Info
  studentInfo: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  studentInfoText: {
    fontSize: 14,
    marginBottom: 4,
  },

  // Dropdown
  dropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  // Checkbox Styles
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderColor: '#d1d5db',
    borderWidth: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },

  // Submit Button
  submitButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Print Modal
  printModalText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 20,
  },
  printDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  printLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  printValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  signatureContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  signatureImage: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
  },
  printButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  printButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Success Modal
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  successMessage: {
    fontSize: 18,
    color: '#10b981',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
  },
  successButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 16,
  },
  successButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});