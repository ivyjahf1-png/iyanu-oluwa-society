import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { toast } from "../lib/safe";
import { Building2, Save } from "lucide-react-native";
import { getAllSettings, saveSettings } from "../lib/supabase";

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function CooperativeBankSettings() {
  const [form, setForm] = useState<BankDetails>({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing settings when screen opens (Supabase + local cache fallback)
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getAllSettings();

        if (data) {
          setForm({
            bankName: data.coop_bank_name || "",
            accountNumber: data.coop_account_number || "",
            accountName: data.coop_account_name || "",
          });
        }
      } catch (error) {
        console.error(error);
        toast("Failed to load current settings");
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleChange = (field: keyof BankDetails, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.accountName.trim()) {
      toast("Please fill all fields");
      return;
    }

    // Simple account number check (Nigeria usually 10 digits)
    if (!/^\d{10}$/.test(form.accountNumber.trim())) {
      toast("Account number should be 10 digits");
      return;
    }

    setSaving(true);
    try {
      // Persists to local storage first (always succeeds), then best-effort
      // syncs to Supabase app_settings — never throws on network failure.
      await saveSettings({
        coop_bank_name: form.bankName.trim(),
        coop_account_number: form.accountNumber.trim(),
        coop_account_name: form.accountName.trim(),
      });

      toast("Settings saved successfully", "Members can now see the new account details");
    } catch (error) {
      console.error(error);
      toast("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar backgroundColor="#0B2211" barStyle="light-content" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4CAF50" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar backgroundColor="#0B2211" barStyle="light-content" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ ...styles.container, flexGrow: 1, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.header}>
            <Building2 size={24} color="#4CAF50" />
            <Text style={styles.headerTitle}>Cooperative Bank Account</Text>
          </View>

          <Text style={styles.description}>
            Shown to members on contribution and loan repayment screens.
          </Text>

          {/* Bank Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Bank Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Zenith Bank, First Bank, Wema Bank"
              placeholderTextColor="#9ca3af"
              value={form.bankName}
              onChangeText={(text) => handleChange("bankName", text)}
              autoCapitalize="words"
            />
          </View>

          {/* Account Number */}
          <View style={styles.field}>
            <Text style={styles.label}>Account Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 1234567890"
              placeholderTextColor="#9ca3af"
              value={form.accountNumber}
              onChangeText={(text) => handleChange("accountNumber", text.replace(/[^0-9]/g, ""))}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {/* Account Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Account Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Iyanu Oluwa Society"
              placeholderTextColor="#9ca3af"
              value={form.accountName}
              onChangeText={(text) => handleChange("accountName", text)}
              autoCapitalize="words"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0B2211",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#FFFFFF",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 24,
  },
  field: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#fff",
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: "#4CAF50",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});