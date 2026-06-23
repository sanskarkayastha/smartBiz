import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  LayoutAnimation,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState, useCallback, useRef } from 'react';
import { Colors } from '@/components/ui/colors';
import ParentTabBackLink from '@/components/ui/ParentTabBackLink';
import VoiceButton from '@/components/ui/VoiceButton';
import { leadsService, Lead, LeadStage, LeadSource, LeadFilters, CreateLeadPayload } from '@/services/leads';
import { parseVoiceForLead } from '@/services/ai';

// ─── Stage config ────────────────────────────────────────────────────────────

const PIPELINE: LeadStage[] = ['NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON'];

const STAGE_CONFIG: Record<LeadStage, { label: string; bg: string; text: string }> = {
  NEW:        { label: 'New',        bg: '#F3F4F6', text: '#6B7280' },
  CONTACTED:  { label: 'Contacted',  bg: Colors.primary + '20', text: Colors.primary },
  INTERESTED: { label: 'Interested', bg: '#FEF3C7', text: '#D97706' },
  PROPOSAL:   { label: 'Proposal',   bg: '#EDE9FE', text: '#7C3AED' },
  WON:        { label: 'Won',        bg: '#D1FAE5', text: '#059669' },
  LOST:       { label: 'Lost',       bg: '#FEE2E2', text: Colors.danger },
};

const SOURCE_LABELS: Record<LeadSource, string> = {
  WALK_IN:      'Walk-in',
  REFERRAL:     'Referral',
  SOCIAL_MEDIA: 'Social Media',
  PHONE_CALL:   'Phone Call',
  ONLINE:       'Online',
  OTHER:        'Other',
};

const STAGE_TABS: (LeadStage | 'ALL')[] = ['ALL', 'NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON', 'LOST'];

// ─── Form state type ──────────────────────────────────────────────────────────

type FormState = {
  name: string;
  phone: string;
  email: string;
  stage: LeadStage;
  source: LeadSource | '';
  estimatedValue: string;
  notes: string;
  followUpDate: string;
};

const EMPTY_FORM: FormState = {
  name: '', phone: '', email: '', stage: 'NEW', source: '',
  estimatedValue: '', notes: '', followUpDate: '',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isOverdue = (dateStr: string | null) => {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
};

const formatFollowUp = (dateStr: string | null) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' });
};

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<LeadStage | 'ALL'>('ALL');
  const [filterSource, setFilterSource] = useState<LeadSource | ''>('');
  const [filterOverdueOnly, setFilterOverdueOnly] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [pendingSource, setPendingSource] = useState<LeadSource | ''>('');
  const [pendingOverdueOnly, setPendingOverdueOnly] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const filtersRef = useRef({ search: '', stage: '', source: '', overdueOnly: false });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const buildFilters = (): LeadFilters | undefined => {
    const { search: s, stage, source, overdueOnly } = filtersRef.current;
    const f: LeadFilters = {};
    if (s.trim()) f.search = s.trim();
    if (stage) f.stage = stage;
    if (source) f.source = source;
    if (overdueOnly) f.overdueOnly = true;
    return Object.keys(f).length ? f : undefined;
  };

  const load = useCallback(async () => {
    setError(false);
    try {
      const data = await leadsService.getLeads(0, 20, buildFilters());
      setLeads(data.content);
      setCurrentPage(0);
      setHasNext(data.hasNext);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = async () => {
    if (!hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const data = await leadsService.getLeads(nextPage, 20, buildFilters());
      setLeads((prev) => [...prev, ...data.content]);
      setCurrentPage(nextPage);
      setHasNext(data.hasNext);
    } catch {
      // silently fail; user can tap again
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSearchChange = (text: string) => {
    setSearch(text);
    filtersRef.current.search = text;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => load(), 400);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!text.trim()) { setSuggestions([]); return; }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        const data = await leadsService.getLeads(0, 5, { search: text });
        setSuggestions(data.content.map((l) => l.name));
      } catch { /* ignore */ }
    }, 300);
  };

  const handleStageSelect = (s: LeadStage | 'ALL') => {
    setStageFilter(s);
    filtersRef.current.stage = s === 'ALL' ? '' : s;
    load();
  };

  const openFilterSheet = () => {
    setPendingSource(filterSource);
    setPendingOverdueOnly(filterOverdueOnly);
    setShowFilterSheet(true);
  };

  const applyFilters = () => {
    filtersRef.current.source = pendingSource;
    filtersRef.current.overdueOnly = pendingOverdueOnly;
    setFilterSource(pendingSource);
    setFilterOverdueOnly(pendingOverdueOnly);
    setShowFilterSheet(false);
    load();
  };

  const clearFilters = () => {
    filtersRef.current.source = '';
    filtersRef.current.overdueOnly = false;
    setPendingSource('');
    setPendingOverdueOnly(false);
    setFilterSource('');
    setFilterOverdueOnly(false);
    setShowFilterSheet(false);
    load();
  };

  const activeFilterCount = (filterSource ? 1 : 0) + (filterOverdueOnly ? 1 : 0);

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (l: Lead) => {
    setEditTarget(l);
    setForm({
      name: l.name,
      phone: l.phone ?? '',
      email: l.email ?? '',
      stage: l.stage,
      source: l.source ?? '',
      estimatedValue: l.estimatedValue != null ? String(l.estimatedValue) : '',
      notes: l.notes ?? '',
      followUpDate: l.followUpDate ?? '',
    });
    setShowModal(true);
  };

  const openVoiceLead = async (text: string) => {
    try {
      const parsed = await parseVoiceForLead(text);
      setEditTarget(null);
      setForm({
        name: parsed.name ?? '',
        phone: parsed.phone ?? '',
        email: parsed.email ?? '',
        stage: (parsed.stage as LeadStage) ?? 'NEW',
        source: (parsed.source as LeadSource) ?? '',
        estimatedValue: parsed.estimatedValue != null ? String(parsed.estimatedValue) : '',
        notes: parsed.notes ?? text,
        followUpDate: parsed.followUpDate ?? '',
      });
      setShowModal(true);
    } catch {
      Alert.alert('Error', 'Could not parse voice input. Please try again.');
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Lead name is required');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<CreateLeadPayload> = {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        stage: form.stage,
        source: (form.source as LeadSource) || undefined,
        estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
        notes: form.notes.trim() || undefined,
        followUpDate: form.followUpDate.trim() || undefined,
      };
      if (editTarget) {
        await leadsService.updateLead(editTarget.id, payload);
      } else {
        await leadsService.createLead(payload as CreateLeadPayload);
      }
      setShowModal(false);
      load();
    } catch {
      Alert.alert('Error', `Failed to ${editTarget ? 'update' : 'create'} lead.`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (l: Lead) => {
    Alert.alert('Delete Lead', `Remove "${l.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await leadsService.deleteLead(l.id);
            if (expandedId === l.id) setExpandedId(null);
            load();
          } catch {
            Alert.alert('Error', 'Failed to delete lead.');
          }
        },
      },
    ]);
  };

  const handleStageStep = async (l: Lead, direction: 1 | -1) => {
    const idx = PIPELINE.indexOf(l.stage);
    if (idx === -1) return;
    const next = PIPELINE[idx + direction];
    if (!next) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      const updated = await leadsService.updateLead(l.id, { stage: next });
      setLeads((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch {
      Alert.alert('Error', 'Failed to update stage.');
    }
  };

  const handleConvert = (l: Lead) => {
    Alert.alert(
      'Convert to Customer',
      `Create a customer record for "${l.name}"? The lead will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert',
          onPress: async () => {
            try {
              await leadsService.convertToCustomer(l.id);
              if (expandedId === l.id) setExpandedId(null);
              load();
              Alert.alert('Success', `${l.name} has been added as a customer.`);
            } catch {
              Alert.alert('Error', 'Failed to convert lead.');
            }
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ParentTabBackLink />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leads</Text>
        <View style={styles.headerActions}>
          <VoiceButton onResult={openVoiceLead} size={18} />
          <Pressable style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
            <Text style={styles.addBtnText}>Add</Text>
          </Pressable>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <View style={styles.searchInputRow}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or phone..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={handleSearchChange}
            />
            {search.length > 0 && (
              <Pressable onPress={() => handleSearchChange('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={openFilterSheet}
          >
            <Ionicons name="options-outline" size={20} color={activeFilterCount > 0 ? Colors.primary : Colors.textDark} />
            {activeFilterCount > 0 && <View style={styles.filterDot} />}
          </Pressable>
        </View>
        {suggestions.length > 0 && search.trim() !== '' && (
          <View style={styles.suggestOverlay}>
            {suggestions.map((name) => (
              <Pressable
                key={name}
                style={styles.suggestItem}
                onPress={() => {
                  if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
                  if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
                  setSearch(name);
                  setSuggestions([]);
                  filtersRef.current.search = name;
                  load();
                }}
              >
                <Text style={styles.suggestText}>{name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Stage filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContent}
      >
        {STAGE_TABS.map((s) => (
          <Pressable
            key={s}
            style={[styles.tab, stageFilter === s && styles.tabActive]}
            onPress={() => handleStageSelect(s)}
          >
            <Text style={[styles.tabText, stageFilter === s && styles.tabTextActive]}>
              {s === 'ALL' ? 'All' : STAGE_CONFIG[s].label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* List */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.empty}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Failed to load leads</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={leads.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          {leads.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="funnel-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>
                {search || stageFilter !== 'ALL' || activeFilterCount > 0 ? 'No leads match your filter' : 'No leads yet'}
              </Text>
              {!search && stageFilter === 'ALL' && activeFilterCount === 0 && (
                <Text style={styles.emptySubText}>Add your first lead to start tracking your pipeline</Text>
              )}
            </View>
          ) : (
            leads.map((l) => {
              const isExpanded = expandedId === l.id;
              const stageConf = STAGE_CONFIG[l.stage];
              const overdue = isOverdue(l.followUpDate);
              const pipelineIdx = PIPELINE.indexOf(l.stage);
              const contactLine = [l.phone, l.email].filter(Boolean).join(' · ');

              return (
                <View key={l.id} style={[styles.card, isExpanded && styles.cardExpanded]}>
                  {/* Collapsed header */}
                  <Pressable
                    style={({ pressed }) => [styles.cardHeader, pressed && { opacity: 0.82 }]}
                    onPress={() => toggleExpand(l.id)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{l.name.slice(0, 2).toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardHeaderInfo}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={styles.name} numberOfLines={1}>{l.name}</Text>
                        <View style={[styles.stageBadge, { backgroundColor: stageConf.bg }]}>
                          <Text style={[styles.stageBadgeText, { color: stageConf.text }]}>{stageConf.label}</Text>
                        </View>
                      </View>
                      <View style={styles.cardSubRow}>
                        {contactLine ? <Text style={styles.sub} numberOfLines={1}>{contactLine}</Text> : null}
                        {l.followUpDate ? (
                          <View style={styles.followUpChip}>
                            <Ionicons
                              name="calendar-outline"
                              size={11}
                              color={overdue ? Colors.danger : Colors.textMuted}
                            />
                            <Text style={[styles.followUpText, overdue && styles.overdueText]}>
                              {formatFollowUp(l.followUpDate)}
                              {overdue ? ' ⚠' : ''}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </Pressable>

                  {/* Expanded section */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <View style={styles.divider} />

                      <View style={styles.detailsGrid}>
                        {l.phone ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Phone</Text>
                            <Text style={styles.detailValue}>{l.phone}</Text>
                          </View>
                        ) : null}
                        {l.email ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Email</Text>
                            <Text style={styles.detailValue}>{l.email}</Text>
                          </View>
                        ) : null}
                        {l.source ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Source</Text>
                            <Text style={styles.detailValue}>{SOURCE_LABELS[l.source]}</Text>
                          </View>
                        ) : null}
                        {l.estimatedValue != null ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Est. Value</Text>
                            <Text style={[styles.detailValue, styles.detailValueBold]}>
                              NPR {l.estimatedValue.toLocaleString()}
                            </Text>
                          </View>
                        ) : null}
                        {l.followUpDate ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Follow-up</Text>
                            <Text style={[styles.detailValue, overdue && styles.overdueText]}>
                              {formatFollowUp(l.followUpDate)}{overdue ? ' ⚠ Overdue' : ''}
                            </Text>
                          </View>
                        ) : null}
                        {l.notes ? (
                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Notes</Text>
                            <Text style={[styles.detailValue, styles.notesValue]}>{l.notes}</Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Stage stepper */}
                      <View style={styles.divider} />
                      <View style={styles.stageStepper}>
                        <Pressable
                          style={[styles.stepBtn, pipelineIdx <= 0 && styles.stepBtnDisabled]}
                          disabled={pipelineIdx <= 0}
                          onPress={() => handleStageStep(l, -1)}
                        >
                          <Ionicons name="chevron-back" size={14} color={pipelineIdx <= 0 ? Colors.textMuted : Colors.primary} />
                          <Text style={[styles.stepBtnText, pipelineIdx <= 0 && { color: Colors.textMuted }]}>
                            {pipelineIdx > 0 ? STAGE_CONFIG[PIPELINE[pipelineIdx - 1]].label : 'Back'}
                          </Text>
                        </Pressable>
                        <View style={[styles.stageChip, { backgroundColor: stageConf.bg }]}>
                          <Text style={[styles.stageChipText, { color: stageConf.text }]}>{stageConf.label}</Text>
                        </View>
                        <Pressable
                          style={[styles.stepBtn, styles.stepBtnRight, (pipelineIdx < 0 || pipelineIdx >= PIPELINE.length - 1) && styles.stepBtnDisabled]}
                          disabled={pipelineIdx < 0 || pipelineIdx >= PIPELINE.length - 1}
                          onPress={() => handleStageStep(l, 1)}
                        >
                          <Text style={[styles.stepBtnText, (pipelineIdx >= PIPELINE.length - 1) && { color: Colors.textMuted }]}>
                            {pipelineIdx >= 0 && pipelineIdx < PIPELINE.length - 1 ? STAGE_CONFIG[PIPELINE[pipelineIdx + 1]].label : 'Next'}
                          </Text>
                          <Ionicons
                            name="chevron-forward"
                            size={14}
                            color={pipelineIdx >= PIPELINE.length - 1 ? Colors.textMuted : Colors.primary}
                          />
                        </Pressable>
                      </View>

                      {/* Action buttons */}
                      <View style={styles.divider} />
                      <View style={styles.actionRow}>
                        <Pressable
                          style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.75 }]}
                          onPress={() => openEdit(l)}
                        >
                          <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
                          <Text style={[styles.actionBtnText, { color: Colors.primary }]}>Edit</Text>
                        </Pressable>
                        <Pressable
                          style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && { opacity: 0.75 }]}
                          onPress={() => handleDelete(l)}
                        >
                          <Ionicons name="trash-outline" size={15} color={Colors.danger} />
                          <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Delete</Text>
                        </Pressable>
                        {l.stage === 'WON' && (
                          <Pressable
                            style={({ pressed }) => [styles.actionBtn, styles.actionBtnConvert, pressed && { opacity: 0.75 }]}
                            onPress={() => handleConvert(l)}
                          >
                            <Ionicons name="person-add-outline" size={15} color="#059669" />
                            <Text style={[styles.actionBtnText, { color: '#059669' }]}>Convert</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
          {hasNext && (
            <Pressable style={styles.loadMoreBtn} onPress={loadMore} disabled={loadingMore}>
              {loadingMore
                ? <ActivityIndicator color={Colors.primary} size="small" />
                : <Text style={styles.loadMoreText}>Load More</Text>}
            </Pressable>
          )}
        </ScrollView>
      )}

      {/* Filter Sheet */}
      <Modal visible={showFilterSheet} animationType="slide" transparent onRequestClose={() => setShowFilterSheet(false)}>
        <View style={styles.filterOverlay}>
          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Leads</Text>
              <Pressable onPress={() => setShowFilterSheet(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            <Text style={styles.filterLabel}>Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <Pressable
                style={[styles.chip, pendingSource === '' && styles.chipActive]}
                onPress={() => setPendingSource('')}
              >
                <Text style={[styles.chipText, pendingSource === '' && styles.chipTextActive]}>All</Text>
              </Pressable>
              {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((src) => (
                <Pressable
                  key={src}
                  style={[styles.chip, pendingSource === src && styles.chipActive]}
                  onPress={() => setPendingSource(pendingSource === src ? '' : src)}
                >
                  <Text style={[styles.chipText, pendingSource === src && styles.chipTextActive]}>
                    {SOURCE_LABELS[src]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              style={[styles.toggleRow, pendingOverdueOnly && styles.toggleRowActive]}
              onPress={() => setPendingOverdueOnly((v) => !v)}
            >
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Overdue Follow-ups Only</Text>
                <Text style={styles.toggleSub}>Show leads with past follow-up dates</Text>
              </View>
              <View style={[styles.toggleKnob, pendingOverdueOnly && styles.toggleKnobActive]}>
                <Ionicons name={pendingOverdueOnly ? 'checkmark' : 'close'} size={14} color={pendingOverdueOnly ? Colors.textOnPrimary : Colors.textMuted} />
              </View>
            </Pressable>

            <View style={styles.filterBtnRow}>
              <Pressable style={styles.clearBtn} onPress={clearFilters}>
                <Text style={styles.clearBtnText}>Clear All</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Lead' : 'New Lead'}</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={Colors.textDark} />
              </Pressable>
            </View>

            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={form.name}
              onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 98XXXXXXXX"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="lead@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Stage</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {(['NEW', 'CONTACTED', 'INTERESTED', 'PROPOSAL', 'WON', 'LOST'] as LeadStage[]).map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.pickerChip,
                    { borderColor: STAGE_CONFIG[s].text + '60' },
                    form.stage === s && { backgroundColor: STAGE_CONFIG[s].bg, borderColor: STAGE_CONFIG[s].text },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, stage: s }))}
                >
                  <Text style={[styles.pickerChipText, { color: form.stage === s ? STAGE_CONFIG[s].text : Colors.textMuted }]}>
                    {STAGE_CONFIG[s].label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {(Object.keys(SOURCE_LABELS) as LeadSource[]).map((src) => (
                <Pressable
                  key={src}
                  style={[
                    styles.pickerChip,
                    form.source === src && { backgroundColor: Colors.primary + '15', borderColor: Colors.primary },
                  ]}
                  onPress={() => setForm((f) => ({ ...f, source: f.source === src ? '' : src }))}
                >
                  <Text style={[styles.pickerChipText, form.source === src && { color: Colors.primary }]}>
                    {SOURCE_LABELS[src]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.label}>Estimated Value (NPR)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 15000"
              keyboardType="numeric"
              value={form.estimatedValue}
              onChangeText={(v) => setForm((f) => ({ ...f, estimatedValue: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Follow-up Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={form.followUpDate}
              onChangeText={(v) => setForm((f) => ({ ...f, followUpDate: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Any notes about this lead..."
              multiline
              numberOfLines={3}
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
              placeholderTextColor={Colors.textMuted}
            />

            <Pressable style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={Colors.textOnPrimary} />
              ) : (
                <Text style={styles.saveBtnText}>{editTarget ? 'Save Changes' : 'Save Lead'}</Text>
              )}
            </Pressable>

            <View style={{ height: 36 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textDark },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: Colors.textOnPrimary, fontWeight: '600', fontSize: 14 },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, gap: 8 },
  searchInputRow: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 8, gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark, padding: 0 },
  filterBtn: { backgroundColor: Colors.card, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, padding: 10 },
  filterBtnActive: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '08' },
  filterDot: { position: 'absolute', top: 5, right: 5, width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, borderWidth: 1.5, borderColor: Colors.card },

  tabsScroll: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  tabActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },

  list: { padding: 16, paddingTop: 8, gap: 10 },
  emptyContainer: { flex: 1, paddingTop: 80 },

  card: { backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cardExpanded: { borderColor: Colors.primary + '50' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  cardHeaderInfo: { flex: 1, minWidth: 0 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },

  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: Colors.primary + '20', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  avatarText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  name: { fontSize: 14, fontWeight: '600', color: Colors.textDark, flex: 1 },
  sub: { fontSize: 12, color: Colors.textMuted },
  stageBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexShrink: 0 },
  stageBadgeText: { fontSize: 11, fontWeight: '600' },

  followUpChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  followUpText: { fontSize: 11, color: Colors.textMuted },
  overdueText: { color: Colors.danger, fontWeight: '600' },

  expandedSection: { paddingHorizontal: 14, paddingBottom: 14 },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 10 },
  detailsGrid: { gap: 6 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  detailLabel: { fontSize: 13, color: Colors.textMuted, width: 90 },
  detailValue: { fontSize: 13, color: Colors.textDark, flex: 1, textAlign: 'right' },
  detailValueBold: { fontWeight: '600' },
  notesValue: { textAlign: 'left' },

  stageStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary + '50', backgroundColor: Colors.primary + '08' },
  stepBtnRight: { flexDirection: 'row' },
  stepBtnDisabled: { borderColor: Colors.border, backgroundColor: Colors.background },
  stepBtnText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  stageChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 8 },
  stageChipText: { fontSize: 13, fontWeight: '700' },

  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: Colors.primary + '12', borderWidth: 1, borderColor: Colors.primary + '30' },
  actionBtnDanger: { backgroundColor: Colors.dangerLight, borderColor: Colors.danger + '30' },
  actionBtnConvert: { backgroundColor: '#D1FAE5', borderColor: '#059669' + '60' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  empty: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32 },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textMuted },
  emptySubText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },
  retryBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 10 },
  retryText: { color: Colors.textOnPrimary, fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 4, marginTop: 12 },
  input: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: Colors.textDark },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  pickerRow: { flexGrow: 0, marginBottom: 2 },
  pickerChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginRight: 8, backgroundColor: Colors.background },
  pickerChipText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: Colors.textOnPrimary, fontWeight: '700', fontSize: 15 },
  loadMoreBtn: { alignItems: 'center', paddingVertical: 16 },
  loadMoreText: { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  filterOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  filterTitle: { fontSize: 18, fontWeight: '700', color: Colors.textDark },
  filterLabel: { fontSize: 13, fontWeight: '600', color: Colors.textDark, marginBottom: 8, marginTop: 4 },
  chipScroll: { flexGrow: 0, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background, marginRight: 8 },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, fontWeight: '500', color: Colors.textMuted },
  chipTextActive: { color: Colors.textOnPrimary, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  toggleRowActive: { borderColor: Colors.primary + '60', backgroundColor: Colors.primary + '06' },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: Colors.textDark },
  toggleSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  toggleKnob: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  toggleKnobActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterBtnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  clearBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  clearBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  applyBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center' },
  applyBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textOnPrimary },
  searchWrapper: { zIndex: 10 },
  suggestOverlay: { position: 'absolute', top: 44, left: 16, right: 16, zIndex: 100, backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 8 },
  suggestItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  suggestText: { fontSize: 14, color: Colors.textDark },
});
