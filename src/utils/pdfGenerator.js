import jsPDF from 'jspdf';
import { toLocalDateString, calculateAge } from './helpers';

const getBase64ImageFromUrl = async (imageUrl) => {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      let canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      let ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      let dataURL = canvas.toDataURL("image/png");
      resolve(dataURL);
    };
    img.onerror = error => reject(error);
    img.src = imageUrl;
  });
};

export const generateMedicalDocumentPDF = async ({ 
  patient, 
  doctor, 
  content, 
  type = 'Receta Médica', 
  signatureDataUrl = null,
  clinicName = 'Centro Médico',
  patientSignatureUrl = null,
  logoUrl = null
}) => {
  // Las Recetas suelen ser tamaño A5 (mitad de un A4). Los Certificados y Consentimientos en A4.
  const isReceta = type === 'Receta Médica';
  const paperFormat = isReceta ? 'a5' : 'a4';
  
  const doc = new jsPDF('p', 'mm', paperFormat);
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Set fonts and colors
  doc.setFont('helvetica');
  
  // Colors (Tailwind equivalents)
  const primaryColor = [14, 165, 233]; // sky-500
  const textColor = [51, 65, 85]; // slate-700
  const lightGray = [241, 245, 249]; // slate-100
  const borderGray = [203, 213, 225]; // slate-300
  
  // --- Header Area ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 35, 'F'); // Responsive width
  
  doc.setTextColor(255, 255, 255);
  
  if (logoUrl) {
    try {
      const logoBase64 = await getBase64ImageFromUrl(logoUrl);
      doc.addImage(logoBase64, 'PNG', 15, 7, 20, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('CENTRO MÉDICO', 40, 16);
      
      doc.setFontSize(isReceta ? 16 : 20); // Smaller font for A5
      doc.setFont('helvetica', 'bold');
      doc.text(clinicName || 'Integrar Salud', 40, 24);
    } catch (e) {
      console.warn('Could not load logo for PDF', e);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('CENTRO MÉDICO', 15, 16);
      doc.setFontSize(isReceta ? 16 : 20);
      doc.setFont('helvetica', 'bold');
      doc.text(clinicName || 'Integrar Salud', 15, 24);
    }
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CENTRO MÉDICO', 15, 16);
    doc.setFontSize(isReceta ? 16 : 20);
    doc.setFont('helvetica', 'bold');
    doc.text(clinicName || 'Integrar Salud', 15, 24);
  }
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${toLocalDateString(new Date())}`, pageWidth - 45, 22);
  
  // --- Document Title ---
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(type.toUpperCase(), pageWidth / 2, 50, { align: 'center' });
  
  // --- Patient Info Box ---
  const boxWidth = pageWidth - 30; // 15mm margins on each side
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.roundedRect(15, 60, boxWidth, 32, 3, 3, 'FD');
  
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Paciente', 20, 68);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Nombre: ${patient?.name || '________________'}`, 20, 76);
  doc.text(`DNI: ${patient?.dni || '________________'}`, 20, 84);
  
  const ageStr = patient?.birthDate ? calculateAge(patient.birthDate) : '____';
  doc.text(`Edad: ${ageStr}`, pageWidth - 55, 84);
  
  // --- Content Area ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0); // Black text for readability
  
  // Split text to handle multiline properly within the responsive page width
  const splitText = doc.splitTextToSize(content || '', pageWidth - 40);
  doc.text(splitText, 20, 105);
  
  // --- Footer / Signatures ---
  
  // Patient Signature (e.g. for Informed Consents)
  if (patientSignatureUrl) {
    doc.addImage(patientSignatureUrl, 'PNG', 20, pageHeight - 65, 40, 16);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.line(20, pageHeight - 45, 60, pageHeight - 45);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(`Firma del Paciente`, 40, pageHeight - 38, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Aclaración: ${patient?.name || ''}`, 40, pageHeight - 32, { align: 'center' });
  }

  // Doctor Signature
  const doctorSigX = pageWidth - 60;
  if (signatureDataUrl) {
     doc.addImage(signatureDataUrl, 'PNG', doctorSigX, pageHeight - 65, 40, 16);
  } else {
     doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
     doc.line(doctorSigX, pageHeight - 45, pageWidth - 20, pageHeight - 45);
  }
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(`Dr/a. ${doctor?.name || '________________'}`, doctorSigX + 20, pageHeight - 38, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(doctor?.specialty ? `Especialidad: ${doctor.specialty}` : `MP / MN: ________________`, doctorSigX + 20, pageHeight - 32, { align: 'center' });
  
  // --- Save PDF ---
  const filename = `${type.replace(/ /g, '_')}_${patient?.name?.replace(/ /g, '_') || 'documento'}.pdf`;
  doc.save(filename);
};
