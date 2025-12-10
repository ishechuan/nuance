import { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, Save, Loader2, MessageSquare, BookOpen, Lightbulb } from 'lucide-react';
import type { FavoriteType, AddFavoriteResponse, GenerateEntryFieldsResponse } from '@/lib/messages';
import type { IdiomItem, SyntaxItem, VocabularyItem } from '@/lib/storage';

interface PendingEntryData {
  selectedText: string;
  url: string;
  title: string;
  timestamp: number;
}

interface AddEntryFormProps {
  pendingEntry: PendingEntryData;
  onBack: () => void;
  onSaved: () => void;
}

type VocabLevel = 'B1' | 'B2' | 'C1' | 'C2';

export function AddEntryForm({ pendingEntry, onBack, onSaved }: AddEntryFormProps) {
  const [entryType, setEntryType] = useState<FavoriteType>('vocabulary');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form fields for Idiom
  const [idiomExpression, setIdiomExpression] = useState('');
  const [idiomMeaning, setIdiomMeaning] = useState('');
  const [idiomExample, setIdiomExample] = useState('');

  // Form fields for Syntax
  const [syntaxSentence, setSyntaxSentence] = useState('');
  const [syntaxStructure, setSyntaxStructure] = useState('');
  const [syntaxExplanation, setSyntaxExplanation] = useState('');

  // Form fields for Vocabulary
  const [vocabWord, setVocabWord] = useState('');
  const [vocabLevel, setVocabLevel] = useState<VocabLevel>('B2');
  const [vocabDefinition, setVocabDefinition] = useState('');
  const [vocabContext, setVocabContext] = useState('');

  // Initialize primary field from selected text
  useEffect(() => {
    const text = pendingEntry.selectedText.trim();
    // Detect type based on text length
    if (text.split(/\s+/).length === 1) {
      // Single word - likely vocabulary
      setEntryType('vocabulary');
      setVocabWord(text);
    } else if (text.length > 50) {
      // Long text - likely syntax
      setEntryType('syntax');
      setSyntaxSentence(text);
    } else {
      // Short phrase - likely idiom
      setEntryType('idiom');
      setIdiomExpression(text);
    }
  }, [pendingEntry.selectedText]);

  // Update primary field when type changes
  const handleTypeChange = (type: FavoriteType) => {
    setEntryType(type);
    const text = pendingEntry.selectedText.trim();
    
    // Clear previous fields and set new primary field
    setIdiomExpression('');
    setIdiomMeaning('');
    setIdiomExample('');
    setSyntaxSentence('');
    setSyntaxStructure('');
    setSyntaxExplanation('');
    setVocabWord('');
    setVocabDefinition('');
    setVocabContext('');

    switch (type) {
      case 'idiom':
        setIdiomExpression(text);
        break;
      case 'syntax':
        setSyntaxSentence(text);
        break;
      case 'vocabulary':
        setVocabWord(text);
        break;
    }
  };

  // Generate fields using AI
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      let primaryValue = '';
      switch (entryType) {
        case 'idiom':
          primaryValue = idiomExpression;
          break;
        case 'syntax':
          primaryValue = syntaxSentence;
          break;
        case 'vocabulary':
          primaryValue = vocabWord;
          break;
      }

      if (!primaryValue.trim()) {
        setError('请先输入主要内容');
        setIsGenerating(false);
        return;
      }

      const response: GenerateEntryFieldsResponse = await browser.runtime.sendMessage({
        type: 'GENERATE_ENTRY_FIELDS',
        entryType,
        primaryValue,
        context: pendingEntry.title,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || '生成失败');
      }

      // Fill in the generated fields
      if (entryType === 'idiom' && response.data.meaning) {
        setIdiomMeaning(response.data.meaning);
        if (response.data.example) setIdiomExample(response.data.example);
      } else if (entryType === 'syntax' && response.data.structure) {
        setSyntaxStructure(response.data.structure);
        if (response.data.explanation) setSyntaxExplanation(response.data.explanation);
      } else if (entryType === 'vocabulary') {
        if (response.data.definition) setVocabDefinition(response.data.definition);
        if (response.data.context) setVocabContext(response.data.context);
        if (response.data.level) setVocabLevel(response.data.level);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // Save the entry
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      let content: IdiomItem | SyntaxItem | VocabularyItem;

      switch (entryType) {
        case 'idiom':
          if (!idiomExpression.trim()) {
            throw new Error('请输入习惯用法');
          }
          content = {
            expression: idiomExpression.trim(),
            meaning: idiomMeaning.trim() || '(未填写)',
            example: idiomExample.trim() || idiomExpression.trim(),
            isManual: true,
          } as IdiomItem;
          break;

        case 'syntax':
          if (!syntaxSentence.trim()) {
            throw new Error('请输入例句');
          }
          content = {
            sentence: syntaxSentence.trim(),
            structure: syntaxStructure.trim() || '(未填写)',
            explanation: syntaxExplanation.trim() || '(未填写)',
            isManual: true,
          } as SyntaxItem;
          break;

        case 'vocabulary':
          if (!vocabWord.trim()) {
            throw new Error('请输入词汇');
          }
          content = {
            word: vocabWord.trim(),
            level: vocabLevel,
            definition: vocabDefinition.trim() || '(未填写)',
            context: vocabContext.trim() || vocabWord.trim(),
            isManual: true,
          } as VocabularyItem;
          break;
      }

      const response: AddFavoriteResponse = await browser.runtime.sendMessage({
        type: 'ADD_FAVORITE',
        articleUrl: pendingEntry.url,
        articleTitle: pendingEntry.title || pendingEntry.url,
        favoriteType: entryType,
        content,
      });

      if (!response.success) {
        throw new Error(response.error || '保存失败');
      }

      setSuccess(true);
      
      // Wait a moment then go back
      setTimeout(() => {
        onSaved();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const renderTypeSelector = () => (
    <div className="type-selector">
      <button
        className={`type-btn ${entryType === 'idiom' ? 'active' : ''}`}
        onClick={() => handleTypeChange('idiom')}
      >
        <MessageSquare size={16} />
        <span>习惯用法</span>
      </button>
      <button
        className={`type-btn ${entryType === 'syntax' ? 'active' : ''}`}
        onClick={() => handleTypeChange('syntax')}
      >
        <BookOpen size={16} />
        <span>语法</span>
      </button>
      <button
        className={`type-btn ${entryType === 'vocabulary' ? 'active' : ''}`}
        onClick={() => handleTypeChange('vocabulary')}
      >
        <Lightbulb size={16} />
        <span>词汇</span>
      </button>
    </div>
  );

  const renderIdiomForm = () => (
    <div className="form-fields">
      <div className="form-group">
        <label className="form-label">习惯用法 *</label>
        <input
          type="text"
          className="form-input"
          value={idiomExpression}
          onChange={(e) => setIdiomExpression(e.target.value)}
          placeholder="例如: break a leg"
        />
      </div>
      <div className="form-group">
        <label className="form-label">含义</label>
        <textarea
          className="form-input form-textarea"
          value={idiomMeaning}
          onChange={(e) => setIdiomMeaning(e.target.value)}
          placeholder="这个表达的含义"
          rows={2}
        />
      </div>
      <div className="form-group">
        <label className="form-label">例句</label>
        <textarea
          className="form-input form-textarea"
          value={idiomExample}
          onChange={(e) => setIdiomExample(e.target.value)}
          placeholder="使用这个表达的例句"
          rows={2}
        />
      </div>
    </div>
  );

  const renderSyntaxForm = () => (
    <div className="form-fields">
      <div className="form-group">
        <label className="form-label">例句 *</label>
        <textarea
          className="form-input form-textarea"
          value={syntaxSentence}
          onChange={(e) => setSyntaxSentence(e.target.value)}
          placeholder="包含语法结构的句子"
          rows={3}
        />
      </div>
      <div className="form-group">
        <label className="form-label">结构</label>
        <input
          type="text"
          className="form-input"
          value={syntaxStructure}
          onChange={(e) => setSyntaxStructure(e.target.value)}
          placeholder="例如: Had + Subject + Past Participle"
        />
      </div>
      <div className="form-group">
        <label className="form-label">解释</label>
        <textarea
          className="form-input form-textarea"
          value={syntaxExplanation}
          onChange={(e) => setSyntaxExplanation(e.target.value)}
          placeholder="语法结构的用法说明"
          rows={2}
        />
      </div>
    </div>
  );

  const renderVocabularyForm = () => (
    <div className="form-fields">
      <div className="form-group">
        <label className="form-label">词汇 *</label>
        <input
          type="text"
          className="form-input"
          value={vocabWord}
          onChange={(e) => setVocabWord(e.target.value)}
          placeholder="例如: ubiquitous"
        />
      </div>
      <div className="form-group">
        <label className="form-label">等级</label>
        <select
          className="form-input"
          value={vocabLevel}
          onChange={(e) => setVocabLevel(e.target.value as VocabLevel)}
        >
          <option value="B1">B1 - 中级</option>
          <option value="B2">B2 - 中高级</option>
          <option value="C1">C1 - 高级</option>
          <option value="C2">C2 - 精通</option>
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">定义</label>
        <textarea
          className="form-input form-textarea"
          value={vocabDefinition}
          onChange={(e) => setVocabDefinition(e.target.value)}
          placeholder="词汇的定义或翻译"
          rows={2}
        />
      </div>
      <div className="form-group">
        <label className="form-label">上下文</label>
        <textarea
          className="form-input form-textarea"
          value={vocabContext}
          onChange={(e) => setVocabContext(e.target.value)}
          placeholder="词汇在文章中的上下文"
          rows={2}
        />
      </div>
    </div>
  );

  return (
    <div className="add-entry-container">
      {/* Header */}
      <header className="header">
        <button className="icon-btn" onClick={onBack} title="返回">
          <ArrowLeft size={18} />
        </button>
        <div className="header-title">
          <Sparkles size={20} />
          <h1>添加到 Nuance</h1>
        </div>
        <div style={{ width: 32 }} />
      </header>

      <div className="content">
        {/* Article Info */}
        <div className="source-info">
          <span className="source-label">来源</span>
          <span className="source-title">{pendingEntry.title || pendingEntry.url}</span>
        </div>

        {/* Selected Text Preview */}
        <div className="selected-text-preview">
          <span className="preview-label">选中的文本</span>
          <div className="preview-text">"{pendingEntry.selectedText}"</div>
        </div>

        {/* Type Selector */}
        {renderTypeSelector()}

        {/* Form Fields */}
        {entryType === 'idiom' && renderIdiomForm()}
        {entryType === 'syntax' && renderSyntaxForm()}
        {entryType === 'vocabulary' && renderVocabularyForm()}

        {/* Error Message */}
        {error && (
          <div className="message error fade-in">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="message success fade-in">
            保存成功！
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button
            className="btn-secondary"
            onClick={handleGenerate}
            disabled={isGenerating || isSaving}
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>AI 补全</span>
              </>
            )}
          </button>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving || isGenerating || success}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>保存</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

