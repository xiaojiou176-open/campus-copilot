import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const repoRoot = process.cwd();

test('redact-live-adapter-fixture keeps campus URLs but strips foreign absolute URLs and user identifiers', () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'campus-copilot-redact-'));
  try {
    const inputPath = join(tempDir, 'input.json');
    const outputPath = join(tempDir, 'output.json');
    writeFileSync(
      inputPath,
      JSON.stringify(
        {
          current_user: {
            id: 8759224,
          },
          course_members: [
            {
              id: 8759224,
              user_id: 8759224,
              email: 'student@example.edu',
              name: 'Example Student',
            },
          ],
          ownerships: [
            {
              id: 390740513,
              user_id: 8759224,
            },
          ],
          uploaded_by_user_id: 8759224,
          submission_url: 'https://www.gradescope.com/courses/1144890/assignments/7244652/submissions/375869113?content=react',
          original_file_url:
            'https://production-gradescope-uploads.s3-us-west-2.amazonaws.com/uploads/pdf_attachment/file/240990462/HW_8.pdf?X-Amz-Signature=secret',
        },
        null,
        2,
      ),
      'utf8',
    );

    execFileSync(
      'node',
      ['scripts/redact-live-adapter-fixture.mjs', '--kind', 'json', '--input', inputPath, '--output', outputPath],
      {
        cwd: repoRoot,
        stdio: 'pipe',
      },
    );

    const output = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.equal(output.current_user.id, 0);
    assert.equal(output.course_members[0].id, 0);
    assert.equal(output.course_members[0].user_id, 0);
    assert.equal(output.ownerships[0].user_id, 0);
    assert.equal(output.uploaded_by_user_id, 0);
    assert.equal(
      output.submission_url,
      'https://www.gradescope.com/courses/1144890/assignments/7244652/submissions/375869113',
    );
    assert.equal(output.original_file_url, '<redacted-url>');
    assert.equal(output.course_members[0].email, '<redacted-string>');
    assert.equal(output.course_members[0].name, '<redacted-name>');
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
