import React from 'react';
import { View, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

// Función para parsear fechas
const parseDate = (dateString) => {
  if (!dateString) return new Date();
  const [day, month, year] = dateString.split('-');
  return new Date(year, month - 1, day);
};

// Componente personalizado para el selector de fecha que funciona en web y móvil
const CustomDatePicker = ({ 
  value, 
  onChange, 
  showPicker, 
  onShowPicker, 
  label = "Fecha",
  placeholder = "Seleccionar fecha",
  styles = {} 
}) => {
  if (Platform.OS === 'web') {
    // Para web, usar input HTML nativo
    const formatDateForInput = (dateString) => {
      if (!dateString) return '';
      const [day, month, year] = dateString.split('-');
      return `${year}-${month}-${day}`;
    };

    const handleWebDateChange = (event) => {
      const selectedDate = event.target.value;
      if (selectedDate) {
        const [year, month, day] = selectedDate.split('-');
        onChange(null, new Date(year, month - 1, day));
      }
    };

    return (
      <View style={styles.fieldCard || {}}>
        <View style={[styles.iconSquare || {}, { backgroundColor: '#00ca77', borderColor: '#00ca77' }]}>
          <Ionicons name="calendar-outline" size={18} color="#ffffff" />
        </View>
        <View style={[styles.fieldContent || {}, { flex: 1, maxWidth: '100%' }]}>
          <Text style={styles.label || {}}>{label}</Text>
          <input
            type="date"
            value={formatDateForInput(value)}
            onChange={handleWebDateChange}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              fontSize: '16px',
              outline: 'none',
              width: '100%',
              maxWidth: '100%',
              padding: '12px',
              borderRadius: '8px',
              fontFamily: 'inherit',
              colorScheme: 'dark',
              boxSizing: 'border-box',
            }}
            placeholder={placeholder}
          />
          <style>{`
            input[type="date"]::-webkit-calendar-picker-indicator {
              filter: invert(1);
              cursor: pointer;
            }
          `}</style>
        </View>
        <View style={[styles.cardAccent || {}, { backgroundColor: '#00ca77' }]} />
      </View>
    );
  }

  // Para móvil, usar DateTimePicker nativo
  return showPicker ? (
    <DateTimePicker
      value={parseDate(value)}
      mode="date"
      display="default"
      onChange={onChange}
    />
  ) : null;
};

export default CustomDatePicker;

