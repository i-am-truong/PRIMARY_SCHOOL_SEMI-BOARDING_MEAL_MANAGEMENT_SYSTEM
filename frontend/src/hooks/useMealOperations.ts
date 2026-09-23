import React, { useEffect, useState } from 'react';
import { mockMealService } from '../mock/mockMealService';
import { ClassRoster, MealDemand, InspectionRecord, TrayDistribution, ReconciliationReport } from '../mock/types';
import { ApiClient } from '../services/apiClient';

export function useMealOperations() {
  const [rosters, setRosters] = useState<ClassRoster[]>(mockMealService.getRosters());
  const [demand, setDemand] = useState<MealDemand>(mockMealService.getMealDemand());
  const [inspection, setInspection] = useState<InspectionRecord>(mockMealService.getInspection());
  const [distributions, setDistributions] = useState<TrayDistribution[]>(mockMealService.getDistributions());
  const [reconciliation, setReconciliation] = useState<ReconciliationReport>(mockMealService.getReconciliationReport());

  useEffect(() => {
    // Initial fetch from real Backend Database
    const fetchRealData = async () => {
      try {
        const res = await ApiClient.getStudentsByClass('1A');
        if (res.success && res.data?.length > 0) {
          const beStudents = res.data;
          setRosters((prev) =>
            prev.map((r) => {
              if (r.className === '1A') {
                return {
                  ...r,
                  students: beStudents.map((s) => ({
                    id: s.id,
                    code: s.studentCode,
                    fullName: s.fullName,
                    gender: 'MALE',
                    grade: 1,
                    className: '1A',
                    allergies: s.allergies || [],
                    isRegisteredBoarding: true,
                    status: s.status === 'PRESENT' ? 'EATING' : s.status === 'EXCUSED_ABSENCE' ? 'ABSENT_EXCUSED' : 'ABSENT_UNEXCUSED',
                  })),
                };
              }
              return r;
            })
          );
        }
      } catch (e) {
        console.warn('Real DB fetch fallback to memory:', e);
      }
    };

    fetchRealData();

    const unsubscribe = mockMealService.subscribe(() => {
      setRosters([...mockMealService.getRosters()]);
      setDemand({ ...mockMealService.getMealDemand() });
      setInspection({ ...mockMealService.getInspection() });
      setDistributions([...mockMealService.getDistributions()]);
      setReconciliation({ ...mockMealService.getReconciliationReport() });
    });
    return unsubscribe;
  }, []);

  return {
    rosters,
    demand,
    inspection,
    distributions,
    reconciliation,
    updateStudentStatus: async (className: string, studentId: string, status: any, absenceReason?: string) => {
      mockMealService.updateStudentStatus(className, studentId, status, absenceReason);
      try {
        const beStatus = status === 'EATING' ? 'PRESENT' : status === 'ABSENT_EXCUSED' ? 'EXCUSED_ABSENCE' : 'UNEXCUSED_ABSENCE';
        await fetch(`http://localhost:3000/api/v1/students/${studentId}/attendance`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-mock-role': 'MGR' },
          body: JSON.stringify({ status: beStatus }),
        });
      } catch (err) {
        console.warn('Real BE attendance update sync:', err);
      }
    },
    toggleLockClassRoster: mockMealService.toggleLockClassRoster.bind(mockMealService),
    lockAllAttendance: mockMealService.lockAllAttendance.bind(mockMealService),
    setBufferPercentage: async (percentage: number) => {
      mockMealService.setBufferPercentage(percentage);
      try {
        await ApiClient.calculateDemand({
          mealScheduleId: 42,
          bufferRate: percentage / 100,
        });
      } catch (err) {
        console.warn('Real BE calculateDemand call sync:', err);
      }
    },
    submitOrderToCatering: async () => {
      try {
        const beRes = await ApiClient.dispatchOrder({
          mealDemandId: 901,
          vendorName: 'Công ty Suất ăn Công nghiệp Hà Nội SunFood',
          targetDeliveryTime: '10:30 AM',
          notes: '18 suất ăn riêng không hải sản đóng thùng dán nhãn màu vàng',
        });
        if (beRes.success && beRes.data) {
          const d = beRes.data;
          mockMealService.submitOrderToCatering({
            orderCode: d.orderCode,
            vendorTrackingRef: d.vendorTrackingRef,
            emailHtmlPreview: d.emailReceipt?.htmlContent,
          });
          return;
        }
      } catch (err) {
        console.warn('Real BE dispatchOrder call sync:', err);
      }
      mockMealService.submitOrderToCatering();
    },
    triggerAutoCutoff: async (bufferRate?: number) => {
      try {
        const res = await ApiClient.triggerAutoCutoff(bufferRate);
        if (res.success && res.data) {
          const execution = res.data;
          const order = execution.orderDispatch;
          mockMealService.submitOrderToCatering({
            orderCode: order.orderCode,
            vendorTrackingRef: order.vendorTrackingRef,
            emailHtmlPreview: order.emailReceipt?.htmlContent,
          });
          return res.data;
        }
      } catch (err) {
        console.warn('Real BE triggerAutoCutoff fallback:', err);
      }
      mockMealService.submitOrderToCatering();
      return null;
    },
    updateInspection: async (record: any) => {
      mockMealService.updateInspection(record);
      try {
        await ApiClient.inspectDelivery({
          mealDeliveryId: 320,
          coreTemperature: record.temperatureProbeCelsius ?? 72.5,
          containerSealsIntact: record.sealIntact ?? true,
          sensoryEvalPass: record.sensoryColorSmellTastePassed ?? true,
          retentionSampleTaken: record.sampleRetained24h ?? true,
          notes: record.notes,
        });
      } catch (err) {
        console.warn('Real BE inspectDelivery call sync:', err);
      }
    },
    confirmTrayDelivery: async (className: string, receivedBy: string) => {
      mockMealService.confirmTrayDelivery(className, receivedBy);
      try {
        await ApiClient.confirmDistribution({
          mealDeliveryId: 320,
          classId: 12,
          allocatedPortions: 28,
          specialDietaryPortions: 1,
        });
      } catch (err) {
        console.warn('Real BE confirmDistribution call sync:', err);
      }
    },
    finalizeReconciliation: async (consumedCount: number, reason?: string) => {
      mockMealService.finalizeReconciliation();
      try {
        await ApiClient.calculateReconciliation({
          cateringOrderId: 650,
          mealDate: new Date().toISOString().slice(0, 10),
          actualConsumedCount: consumedCount,
          discrepancyReason: reason,
        });
      } catch (err) {
        console.warn('Real BE calculateReconciliation call sync:', err);
      }
    },
  };
}
