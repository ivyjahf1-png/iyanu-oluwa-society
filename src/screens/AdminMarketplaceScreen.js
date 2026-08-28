import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import SafeImage from '../components/SafeImage';
import { useSafeNavigation } from '../hooks/useSafeNavigation';
import {
  Plus,
  Search,
  PackageOpen,
  Trash2,
  Upload,
  Eye,
  Pencil,
  X,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import ScreenHeader from '../components/ScreenHeader';
import { useMarketItems } from '../context/MarketItemsContext';

export default function AdminMarketplaceScreen({ navigation: rawNav }) {
  const navigation = useSafeNavigation(rawNav);
  const { items, addItem, removeItem, updateItem } = useMarketItems();

  // Upload form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState(null);

  // Real-time alphabetical search
  const [query, setQuery] = useState('');

  // View / Edit modals
  const [viewItem, setViewItem] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');

  const openEdit = (item) => {
    setEditItem(item);
    setEditTitle(item.title || '');
    setEditPrice(item.price || '');
    setEditDescription(item.description || '');
    setEditLocation(item.location || '');
  };

  const saveEdit = () => {
    if (!editItem) return;
    if (!editTitle.trim()) {
      Alert.alert('Title required', 'Item title cannot be empty.');
      return;
    }
    updateItem(editItem.id, {
      title: editTitle.trim(),
      price: editPrice.trim(),
      description: editDescription.trim(),
      location: editLocation.trim(),
    });
    setEditItem(null);
    Alert.alert('Updated', `"${editTitle.trim()}" has been updated.`);
  };

  const pickImage = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (e) {
      Alert.alert('Upload error', 'Could not open the picker.');
    }
  };

  const submitItem = () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Enter a title for the item.');
      return;
    }
    if (!price.trim()) {
      Alert.alert('Price required', 'Enter a price for the item.');
      return;
    }
    addItem({
      title: title.trim(),
      description: description.trim(),
      price: price.trim().startsWith('₦') ? price.trim() : `₦${price.trim()}`,
      location: location.trim(),
      imageUri,
    });
    setTitle('');
    setDescription('');
    setPrice('');
    setLocation('');
    setImageUri(null);
    setShowForm(false);
    Alert.alert('Uploaded', 'The item is now live in the member marketplace.');
  };

  // Instant filter: items starting with or containing the query (case-insensitive).
  const filtered = items.filter(i =>
    i.title.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor='#F4F7F5' />
      <ScreenHeader
        title="Marketplace Dashboard"
        subtitle="Upload & manage inventory"
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, styles.grow]} showsVerticalScrollIndicator={false}>
        {/* Upload toggle */}
        <TouchableOpacity
          style={[styles.uploadToggle, showForm && styles.uploadToggleActive]}
          onPress={() => setShowForm(!showForm)}
        >
          <Plus size={18} color={showForm ? '#FFFFFF' : '#10B981'} />
          <Text style={[styles.uploadToggleText, showForm && styles.uploadToggleTextActive]}>
            {showForm ? 'Close Upload Form' : 'Upload New Item'}
          </Text>
        </TouchableOpacity>

        {/* Upload form */}
        {showForm && (
          <View style={styles.formCard}>
            <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
              {imageUri ? (
                <SafeImage source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : (
                <>
                  <Upload size={26} color="#10B981" />
                  <Text style={styles.imagePickerText}>Tap to upload item photo</Text>
                </>
              )}
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Item title"
              placeholderTextColor="#526E63"
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              placeholderTextColor="#526E63"
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Price (e.g. 450000)"
              placeholderTextColor="#526E63"
              keyboardType="decimal-pad"
            />
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Available location (e.g. Lagos)"
              placeholderTextColor="#526E63"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={submitItem}>
              <Plus size={17} color='#0F172A' />
              <Text style={styles.submitBtnText}>Publish Item</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Real-time search */}
        <View style={styles.searchBar}>
          <Search size={18} color='#8EA89D' />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search inventory alphabetically..."
            placeholderTextColor="#526E63"
            autoCapitalize="none"
          />
        </View>

        {/* Inventory results */}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <PackageOpen size={40} color="#9CB8A6" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptySub}>
              {items.length === 0
                ? 'Upload your first item using the button above.'
                : `No inventory items match "${query}".`}
            </Text>
          </View>
        ) : (
          filtered.map(item => (
            <View key={item.id} style={styles.itemCard}>
              {item.imageUri ? (
                <SafeImage source={{ uri: item.imageUri }} style={styles.itemThumb} />
              ) : (
                <View style={[styles.itemThumb, styles.itemThumbPlaceholder]}>
                  <PackageOpen size={20} color="#10B981" />
                </View>
              )}
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemPrice}>{item.price}</Text>
                {item.location ? <Text style={styles.itemLocation}>{item.location}</Text> : null}
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  onPress={() => setViewItem(item)}
                  style={[styles.actionBtn, styles.viewBtn]}
                >
                  <Eye size={16} color='#0F172A' />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => openEdit(item)}
                  style={[styles.actionBtn, styles.editBtn]}
                >
                  <Pencil size={16} color='#0F172A' />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                  <Trash2 size={17} color="#C0392B" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* View modal — read-only details */}
        <Modal visible={!!viewItem} transparent animationType="slide" onRequestClose={() => setViewItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Item Details</Text>
                <TouchableOpacity onPress={() => setViewItem(null)} style={styles.modalClose}>
                  <X size={20} color='#F4F7F5' />
                </TouchableOpacity>
              </View>
              {viewItem && (
                <ScrollView showsVerticalScrollIndicator={true}>
                  {viewItem.imageUri ? (
                    <SafeImage source={{ uri: viewItem.imageUri }} style={styles.modalImage} />
                  ) : null}
                  <Text style={styles.modalName}>{viewItem.title}</Text>
                  {!!viewItem.price && <Text style={styles.modalPrice}>{viewItem.price}</Text>}
                  {!!viewItem.location && <Text style={styles.modalLocation}>Location: {viewItem.location}</Text>}
                  {!!viewItem.description && <Text style={styles.modalDesc}>{viewItem.description}</Text>}
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Edit modal — editable form */}
        <Modal visible={!!editItem} transparent animationType="slide" onRequestClose={() => setEditItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Item</Text>
                <TouchableOpacity onPress={() => setEditItem(null)} style={styles.modalClose}>
                  <X size={20} color='#F4F7F5' />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Item name"
                placeholderTextColor="#526E63"
              />
              <TextInput
                style={styles.editInput}
                value={editPrice}
                onChangeText={setEditPrice}
                placeholder="Price"
                placeholderTextColor="#526E63"
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.editInput, styles.editTextarea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Description"
                placeholderTextColor="#526E63"
                multiline
              />
              <TextInput
                style={styles.editInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Location"
                placeholderTextColor="#526E63"
              />
              <TouchableOpacity style={styles.saveEditBtn} onPress={saveEdit}>
                <Text style={styles.saveEditText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // View / Edit / Delete action buttons
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtn: { backgroundColor: '#10B981' },
  editBtn: { backgroundColor: '#2563EB' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { color: '#0F172A', fontSize: 17, fontWeight: 'bold' },
  modalClose: { padding: 4 },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#D1FAE5',
  },
  modalName: { color: '#0F172A', fontSize: 18, fontWeight: 'bold' },
  modalPrice: { color: '#10B981', fontSize: 16, fontWeight: '700', marginTop: 4 },
  modalLocation: { color: '#8EA89D', fontSize: 13, marginTop: 4 },
  modalDesc: { color: '#8EA89D', fontSize: 14, marginTop: 10, lineHeight: 20 },
  editInput: {
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  editTextarea: { height: 90, textAlignVertical: 'top' },
  saveEditBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  saveEditText: { color: '#0F172A', fontSize: 15, fontWeight: 'bold' },
  scrollView: { flex: 1 },
  grow: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#F4F7F5' },
  content: { padding: 16, paddingBottom: 32 },
  uploadToggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    paddingVertical: 13,
    marginBottom: 14,
  },
  uploadToggleActive: {
    backgroundColor: '#06130D',
    borderColor: '#F4F7F5',
  },
  uploadToggleText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  uploadToggleTextActive: {
    color: '#0F172A',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 16,
  },
  imagePicker: {
    height: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: {
    color: '#8EA89D',
    fontSize: 12,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    paddingVertical: 11,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 46,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 12,
  },
  emptySub: {
    color: '#8EA89D',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 17,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginBottom: 10,
  },
  itemThumb: {
    width: 54,
    height: 54,
    borderRadius: 10,
  },
  itemThumbPlaceholder: {
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  itemPrice: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 3,
  },
  itemLocation: {
    color: '#8EA89D',
    fontSize: 10,
    marginTop: 2,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
