import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Upload, AlertCircle } from 'lucide-react';

export default function AdminExamBankImport() {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleImport = async () => {
    if (!csvText.trim()) {
      alert('Please paste CSV data');
      return;
    }

    setImporting(true);
    setResults(null);

    try {
      // Fetch exam config to get exam_id
      const examConfigs = await base44.entities.ExamConfig.filter({ is_active: true });
      if (examConfigs.length === 0) {
        alert('No active exam config found. Please create an exam config first.');
        setImporting(false);
        return;
      }
      const examConfig = examConfigs[0];

      // Fetch all sections
      const sections = await base44.entities.ExamSection.list();
      const sectionMap = {};
      sections.forEach(s => {
        sectionMap[s.key] = s.id;
      });

      // Parse CSV
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Validate headers
      const expectedHeaders = ['section_key', 'question_type', 'question_text', 'opt_A', 'opt_B', 'opt_C', 'opt_D', 'correct_keys', 'published_flag'];
      const headersValid = expectedHeaders.every(h => headers.includes(h));
      
      if (!headersValid) {
        alert('Invalid CSV headers. Expected: section_key,question_type,question_text,opt_A,opt_B,opt_C,opt_D,correct_keys,published_flag');
        setImporting(false);
        return;
      }

      const imported = [];
      const failed = [];

      // Process each row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        try {
          // Parse CSV row (basic parsing - doesn't handle quotes with commas)
          const values = line.split(',').map(v => v.trim());
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || '';
          });

          // Validate section_key
          if (!row.section_key || !sectionMap[row.section_key]) {
            failed.push({ row: i + 1, reason: `Invalid section_key: ${row.section_key}` });
            continue;
          }

          // Validate question_text
          if (!row.question_text) {
            failed.push({ row: i + 1, reason: 'Missing question_text' });
            continue;
          }

          // Build options_json
          let optionsJson;
          if (row.question_type === 'true_false') {
            optionsJson = JSON.stringify([
              { key: 'True', label: 'True' },
              { key: 'False', label: 'False' }
            ]);
          } else {
            const options = [];
            if (row.opt_A) options.push({ key: 'A', label: row.opt_A });
            if (row.opt_B) options.push({ key: 'B', label: row.opt_B });
            if (row.opt_C) options.push({ key: 'C', label: row.opt_C });
            if (row.opt_D) options.push({ key: 'D', label: row.opt_D });
            
            if (options.length === 0) {
              failed.push({ row: i + 1, reason: 'No options provided' });
              continue;
            }
            
            optionsJson = JSON.stringify(options);
          }

          // Build correct_answer_json
          if (!row.correct_keys) {
            failed.push({ row: i + 1, reason: 'Missing correct_keys' });
            continue;
          }

          const correctKeys = row.correct_keys.split('|').map(k => k.trim()).filter(k => k);
          if (correctKeys.length === 0) {
            failed.push({ row: i + 1, reason: 'No valid correct_keys' });
            continue;
          }

          // Validate correct_keys match available options
          const availableKeys = row.question_type === 'true_false' 
            ? ['True', 'False']
            : ['A', 'B', 'C', 'D'].slice(0, [row.opt_A, row.opt_B, row.opt_C, row.opt_D].filter(Boolean).length);
          
          const invalidKeys = correctKeys.filter(k => !availableKeys.includes(k));
          if (invalidKeys.length > 0) {
            failed.push({ row: i + 1, reason: `Invalid correct_keys: ${invalidKeys.join(', ')}` });
            continue;
          }

          const correctAnswerJson = JSON.stringify({ keys: correctKeys });

          // Create question
          const question = await base44.entities.ExamQuestion.create({
            exam_id: examConfig.id,
            exam_section_id: sectionMap[row.section_key],
            question_text: row.question_text,
            question_type: row.question_type || 'single_choice',
            options_json: optionsJson,
            correct_answer_json: correctAnswerJson,
            points: 1,
            published_flag: row.published_flag === 'true' || row.published_flag === '1' || row.published_flag === 'TRUE',
          });

          imported.push({ row: i + 1, id: question.id });
        } catch (error) {
          failed.push({ row: i + 1, reason: error.message });
        }
      }

      setResults({ imported, failed });
    } catch (error) {
      alert('Import failed: ' + error.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Exam Bank Import</h1>
          <p className="text-slate-500 mt-1">Import exam questions via CSV</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>CSV Format</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>
                <strong>Required headers:</strong><br />
                section_key,question_type,question_text,opt_A,opt_B,opt_C,opt_D,correct_keys,published_flag
              </AlertDescription>
            </Alert>
            <div className="space-y-2 text-sm text-slate-600">
              <p><strong>section_key:</strong> marketing_fundamentals | mops_fundamentals_cadot | marketo_mastery_cadot_scenarios | mops_in_practice</p>
              <p><strong>question_type:</strong> single_choice | multi_choice | true_false</p>
              <p><strong>correct_keys:</strong> For single answer: A or B or C or D (or True/False for true_false). For multiple: A|B|C (pipe-separated)</p>
              <p><strong>published_flag:</strong> true or false</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Paste CSV Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="section_key,question_type,question_text,opt_A,opt_B,opt_C,opt_D,correct_keys,published_flag
marketing_fundamentals,single_choice,What is MarTech?,Marketing Technology,Tech Marketing,Marketing Tech,Technology,A,true"
              rows={12}
              className="font-mono text-sm"
            />
            <Button
              onClick={handleImport}
              disabled={importing || !csvText.trim()}
              className="mt-4 bg-violet-600 hover:bg-violet-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Import Questions'}
            </Button>
          </CardContent>
        </Card>

        {results && (
          <Card>
            <CardHeader>
              <CardTitle>Import Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      {results.imported.length} questions imported successfully
                    </p>
                  </div>
                </div>

                {results.failed.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3 mb-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <p className="font-semibold text-red-900">
                        {results.failed.length} questions failed
                      </p>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {results.failed.map((fail, idx) => (
                        <div key={idx} className="text-sm text-red-800 bg-white/50 p-2 rounded">
                          <strong>Row {fail.row}:</strong> {fail.reason}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}