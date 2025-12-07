import { Box, Button, Flex, Badge, Text, VStack } from '@chakra-ui/react';
import { motion } from 'framer-motion';

import type { Anime, AnimeStatus } from '@/types/anime';
import type { PlaylistDraft } from '@/types/playlist';
import { quarterToJapaneseName } from '@/utils/quarterHelper';

interface QuarterSelectorProps {
  animeData: Anime[];
  animeStatuses: Map<string, AnimeStatus>;
  drafts: Map<string, PlaylistDraft>;
  onSelectQuarter: (quarter: string) => void;
}

const MotionBox = motion.create(Box);

export function QuarterSelector({
  animeData,
  animeStatuses,
  drafts,
  onSelectQuarter,
}: QuarterSelectorProps) {
  // 視聴済みアニメがあるクォーターを抽出
  const watchedQuarters = Array.from(
    new Set(
      animeData
        .filter((anime) => animeStatuses.get(anime.id) === 'watched' && anime.songs.length > 0)
        .map((anime) => anime.quarter),
    ),
  ).sort();

  if (watchedQuarters.length === 0) {
    return (
      <Box py={8} textAlign="center">
        <Text color="gray.400" fontSize="md" mb={1}>
          視聴済みアニメがありません
        </Text>
        <Text color="gray.500" fontSize="sm">
          まずはメインページで視聴済みアニメを選択してください
        </Text>
      </Box>
    );
  }

  return (
    <VStack gap={3} align="stretch">
      {watchedQuarters.map((quarter, index) => {
        const draft = drafts.get(quarter);
        const quarterAnime = animeData.filter(
          (anime) =>
            anime.quarter === quarter &&
            animeStatuses.get(anime.id) === 'watched' &&
            anime.songs.length > 0,
        );
        const totalSongs = quarterAnime.reduce((sum, anime) => sum + anime.songs.length, 0);

        // ステータス判定
        const status = draft ? (draft.tracks.length > 0 ? 'completed' : 'draft') : 'not_created';

        const statusColor = {
          not_created: 'gray',
          draft: 'yellow',
          completed: 'green',
        }[status] as 'gray' | 'yellow' | 'green';

        const statusText = {
          not_created: '未作成',
          draft: '作成中',
          completed: '完了',
        }[status];

        return (
          <MotionBox
            key={quarter}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            p={4}
            borderWidth="1px"
            borderRadius="md"
            bg="bg.surface"
            borderColor="border.default"
            _hover={{ borderColor: 'border.default', cursor: 'pointer' }}
            onClick={() => onSelectQuarter(quarter)}
          >
            <Flex justify="space-between" align="center" gap={4}>
              <Box flex="1">
                <Flex gap={2} align="center" mb={1} flexWrap="wrap">
                  <Text fontWeight="semibold" fontSize="md" color="fg.default">
                    {quarterToJapaneseName(quarter)}
                  </Text>
                  <Badge colorScheme={statusColor} fontSize="xs">
                    {statusText}
                  </Badge>
                </Flex>
                <Flex gap={3} fontSize="sm" color="fg.muted" flexWrap="wrap">
                  <Text>{quarterAnime.length} 作品</Text>
                  <Text>•</Text>
                  <Text>{totalSongs} 曲</Text>
                  {draft && (
                    <>
                      <Text>•</Text>
                      <Text>{draft.tracks.filter((t) => t.selectedTrack).length} 曲マッチング済み</Text>
                    </>
                  )}
                </Flex>
              </Box>
              <Button
                size="sm"
                colorScheme={status === 'completed' ? 'green' : 'gray'}
                variant={status === 'completed' ? 'solid' : 'outline'}
              >
                {status === 'not_created' ? '作成開始' : '編集'}
              </Button>
            </Flex>
          </MotionBox>
        );
      })}
    </VStack>
  );
}
