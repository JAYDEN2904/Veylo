import { resolveAvatarsStoragePath } from './avatarStoragePath';

describe('resolveAvatarsStoragePath', () => {
  it('returns storage path as-is (without bucket prefix)', () => {
    expect(resolveAvatarsStoragePath('936b08d8-e96a-4ef1-ae38-5cb83f8194fc/avatar-abc.jpg')).toBe(
      '936b08d8-e96a-4ef1-ae38-5cb83f8194fc/avatar-abc.jpg'
    );
  });

  it('strips avatars/ prefix', () => {
    expect(resolveAvatarsStoragePath('avatars/uid/avatar.jpg')).toBe('uid/avatar.jpg');
  });

  it('extracts path from signed URL', () => {
    const url =
      'https://igeyjmcfklymyeaahmtw.supabase.co/storage/v1/object/sign/avatars/uid%2Favatar-abc.jpg?token=xyz';
    expect(resolveAvatarsStoragePath(url)).toBe('uid/avatar-abc.jpg');
  });

  it('returns null for local file URIs', () => {
    expect(resolveAvatarsStoragePath('file:///data/user/0/cache/photo.jpg')).toBeNull();
  });
});
