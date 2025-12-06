'use client';

import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
  DialogBackdrop,
  DialogPositioner,
  Button,
  IconButton,
} from '@chakra-ui/react';
import { Box, VStack, Text, Badge, Link, Image, Portal } from '@chakra-ui/react';
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
    } catch (_error) {
      return null;
    }
  };

  const officialUrl = getOfficialUrlFromImage(anime.imageUrl ?? undefined);
  const shoboiUrl = anime.url;

  return (
    <DialogRoot open={open} onOpenChange={(e) => !e.open && onClose()} size="lg" placement="center">
      <Portal>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent
            boxShadow="2xl"
            borderRadius="lg"
            border="1px solid"
            borderColor="gray.200"
            _dark={{ borderColor: 'gray.700' }}
          >
            <IconButton
              aria-label="Close dialog"
              onClick={onClose}
              position="absolute"
              top={2}
              right={2}
              variant="ghost"
              size="sm"
            >
              <X size={20} />
            </IconButton>
            <DialogHeader>
              <DialogTitle>{anime.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <VStack align="stretch" gap={4}>
                {/* Quarter Info */}
                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="fg.muted"
                  >
                    クォータ
                  </Text>
                  <Badge colorScheme="blue" mt={1}>
                    {anime.quarter}
                  </Badge>
                </Box>

                {/* URL */}
                {(officialUrl || shoboiUrl) && (
                  <Box>
                    <Text
                      fontSize="sm"
                      fontWeight="medium"
                      color="fg.muted"
                    >
                      詳細情報
                    </Text>
                    <VStack align="start" gap={1} mt={1} fontSize="sm">
                      {officialUrl && (
                        <Link
                          href={officialUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="blue.500"
                          _dark={{ color: 'blue.300' }}
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <span>公式サイトを開く ({officialUrl})</span>
                          <ExternalLink size={14} />
                        </Link>
                      )}
                      {shoboiUrl && (
                        <Link
                          href={shoboiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          color="blue.500"
                          _dark={{ color: 'blue.300' }}
                          display="flex"
                          alignItems="center"
                          gap={1}
                        >
                          <span>しょぼいカレンダーで見る</span>
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </VStack>
                  </Box>
                )}

                {/* Songs */}
                <Box>
                  <Text
                    fontSize="sm"
                    fontWeight="medium"
                    color="fg.muted"
                    mb={2}
                  >
                    楽曲一覧 ({anime.songs.length}曲)
                  </Text>
                  <VStack align="stretch" gap={3}>
                    {anime.songs.map((song, index) => (
                      <Box
                        key={index}
                        p={3}
                        borderRadius="md"
                        bg="gray.50"
                        _dark={{ bg: 'gray.700' }}
                      >
                        <Badge colorScheme="purple" fontSize="xs" mb={1}>
                          {song.type}
                        </Badge>
                        <Text fontWeight="medium" fontSize="sm">
                          {song.trackName}
                        </Text>
                        <VStack
                          align="start"
                          gap={0.5}
                          mt={1}
                          fontSize="xs"
                          color="fg.muted"
                        >
                          {song.artist && <Text>アーティスト: {song.artist}</Text>}
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
            <DialogFooter>
              <Button onClick={onClose} variant="outline" width="full">
                閉じる
              </Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </Portal>
    </DialogRoot>
  );
}
