'use client';

import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogBackdrop,
  DialogPositioner,
  Button,
  IconButton,
  Box,
  VStack,
  Text,
  Badge,
  Link,
  Portal,
} from '@chakra-ui/react';
import { ExternalLink, X } from 'lucide-react';

import type { Anime } from '@/types/anime';

interface AnimeDetailDialogProps {
  anime: Anime | null;
  open: boolean;
  onClose: () => void;
}

export function AnimeDetailDialog({ anime, open, onClose }: AnimeDetailDialogProps) {
  if (!anime) return null;

  const getOfficialUrlFromImage = (imageUrl?: string | null) => {
    if (!imageUrl) return null;
    try {
      const url = new URL(imageUrl);
      const encoded = url.searchParams.get('url');
      if (!encoded) return null;
      return decodeURIComponent(encoded);
    } catch {
      return null;
    }
  };

  const officialUrl = getOfficialUrlFromImage(anime.imageUrl ?? undefined);
  const shoboiUrl = anime.url;

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      size="full"
      placement="center"
    >
      <Portal>
        <DialogBackdrop bg="rgba(0, 0, 0, 0.7)" backdropFilter="blur(4px)" />
        <DialogPositioner>
          <DialogContent mx={3} my={6} maxH="90vh" overflowY="auto" className="custom-scroll">
            <IconButton
              aria-label="Close dialog"
              onClick={onClose}
              position="absolute"
              top={2}
              right={2}
              variant="ghost"
              size="sm"
              color="fg.muted"
              borderRadius="10px"
              zIndex={1}
            >
              <X size={18} />
            </IconButton>
            <DialogHeader pt={4} pb={2} px={4}>
              <DialogTitle fontSize="md" pr={6} lineHeight="1.4">
                {anime.name}
              </DialogTitle>
            </DialogHeader>
            <DialogBody px={4} py={2}>
              <VStack align="stretch" gap={4}>
                {/* Quarter */}
                <Box>
                  <Badge fontSize="xs" px={2} className="badge-amber">
                    {anime.quarter}
                  </Badge>
                </Box>

                {/* Links */}
                {(officialUrl || shoboiUrl) && (
                  <VStack align="start" gap={2} fontSize="sm">
                    {officialUrl && (
                      <Link
                        href={officialUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="#ff6b6b"
                        display="flex"
                        alignItems="center"
                        gap={1}
                        fontSize="xs"
                      >
                        <span>公式サイト</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                    {shoboiUrl && (
                      <Link
                        href={shoboiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="#ff6b6b"
                        display="flex"
                        alignItems="center"
                        gap={1}
                        fontSize="xs"
                      >
                        <span>しょぼいカレンダー</span>
                        <ExternalLink size={12} />
                      </Link>
                    )}
                  </VStack>
                )}

                {/* Songs */}
                <Box>
                  <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={2}>
                    楽曲一覧 ({anime.songs.length}曲)
                  </Text>
                  <VStack align="stretch" gap={2}>
                    {anime.songs.map((song, index) => (
                      <Box
                        key={index}
                        p={3}
                        borderRadius="12px"
                        bg="rgba(255, 255, 255, 0.04)"
                        border="1px solid rgba(255, 255, 255, 0.06)"
                      >
                        <Badge fontSize="2xs" px={1.5} mb={1} className="badge-coral">
                          {song.type}
                        </Badge>
                        <Text fontWeight="medium" fontSize="sm" lineHeight="1.3">
                          {song.trackName}
                        </Text>
                        <VStack align="start" gap={0} mt={1} fontSize="xs" color="fg.muted">
                          {song.artist && <Text>{song.artist}</Text>}
                          {song.composer && <Text>作曲: {song.composer}</Text>}
                          {song.lyrics && <Text>作詞: {song.lyrics}</Text>}
                          {song.arranger && <Text>編曲: {song.arranger}</Text>}
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </VStack>
            </DialogBody>
            <DialogFooter px={4} pb={4} pt={2}>
              <Button
                onClick={onClose}
                width="full"
                bg="rgba(255, 107, 107, 0.15)"
                color="#ff6b6b"
                _hover={{ bg: 'rgba(255, 107, 107, 0.25)' }}
                borderRadius="12px"
                h="44px"
                fontSize="sm"
              >
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
