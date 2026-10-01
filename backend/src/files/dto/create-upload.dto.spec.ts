import { BadRequestException } from '@nestjs/common';
import { uploadBodyPipe } from '../files.controller';
import { CreateUploadDto } from './create-upload.dto';

describe('CreateUploadDto through the upload body pipe', () => {
  const run = (body: unknown) => uploadBodyPipe.transform(body, { type: 'body', metatype: CreateUploadDto });

  it('passes real numbers and booleans through as the DTO', async () => {
    const dto = await run({ path: 'world', name: 'big.zip', size: 10, overwrite: false });
    expect(dto).toBeInstanceOf(CreateUploadDto);
    expect(dto).toMatchObject({ size: 10, overwrite: false });
  });

  // A string size made `complete` compare 10 !== "10" forever; "false" validated as true.
  it.each([{ size: '10' }, { size: 10, overwrite: 'false' }, { size: -1 }, { size: 1.5 }, { size: 1, extra: true }])('rejects %j', async (fields) => {
    await expect(run({ name: 'a.bin', ...fields })).rejects.toThrow(BadRequestException);
  });
});
