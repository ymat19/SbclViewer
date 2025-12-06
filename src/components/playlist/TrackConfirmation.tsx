import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Text,
  VStack,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

import type { DraftTrack } from '@/types/playlist';

interface TrackConfirmationProps {
  quarter: string;
  tracks: DraftTrack[];
  onSave: () => void;
  onCancel: () => void;
  onEditTrack: (index: number) => void;
}

const MotionBox = motion.create(Box);
const MotionCard = motion.create(Card.Root);

export function TrackConfirmation({
  quarter,
  tracks,
  onSave,
  onCancel,
  onEditTrack,
}: TrackConfirmationProps) {
  const matchedTracks = tracks.filter((t) => t.selectedTrack);
  const skippedTracks = tracks.filter((t) => !t.selectedTrack);

  return (
    <VStack gap={6} align="stretch">
      {/* ヘッダー */}
      <MotionBox
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Heading size="lg" mb={2} color="white">
          確認画面
        </Heading>
        <Text color="gray.400" fontSize="sm">
          マッチング結果を確認してください。誤った選択があれば「再選択」から修正できます。
        </Text>
      </MotionBox>

      {/* サマリー */}
      <MotionCard
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        bg="gray.800"
        borderWidth="1px"
        borderColor="gray.700"
      >
        <Card.Body>
          <HStack gap={6} justify="center" flexWrap="wrap">
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.400" mb={1} fontWeight="medium">
                総楽曲数
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="white">
                {tracks.length}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.400" mb={1} fontWeight="medium">
                マッチング済み
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="green.400">
                {matchedTracks.length}
              </Text>
            </Box>
            <Box textAlign="center">
              <Text fontSize="xs" color="gray.400" mb={1} fontWeight="medium">
                スキップ
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="gray.500">
                {skippedTracks.length}
              </Text>
            </Box>
          </HStack>
        </Card.Body>
      </MotionCard>

      {/* マッチング済み楽曲 */}
      {matchedTracks.length > 0 && (
        <MotionBox
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Heading size="md" mb={3} color="gray.200">
            マッチング済み楽曲 ({matchedTracks.length})
          </Heading>
          <VStack gap={2} align="stretch">
            {matchedTracks.map((track, index) => {
              const originalIndex = tracks.indexOf(track);
              return (
                <motion.div
                  key={originalIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <Card.Root
                    bg="gray.800"
                    borderWidth="1px"
                    borderColor="gray.700"
                    borderLeftWidth="3px"
                    borderLeftColor="green.600"
                  >
                    <Card.Body py={3}>
                      <Flex justify="space-between" align="start" gap={4}>
                        <Box flex="1">
                          <Flex gap={2} mb={2} flexWrap="wrap" align="center">
                            <Badge colorScheme="gray" size="sm">
                              {track.animeName}
                            </Badge>
                            <Badge colorScheme="gray" size="sm">
                              {track.song.type}
                            </Badge>
                            {track.matchStatus === 'auto' && (
                              <Badge colorScheme="green" size="sm">
                                自動
                              </Badge>
                            )}
                            {track.matchStatus === 'manual' && (
                              <Badge colorScheme="yellow" size="sm">
                                手動
                              </Badge>
                            )}
                          </Flex>
                          <Text fontWeight="semibold" mb={1} color="white" fontSize="sm">
                            {track.song.trackName}
                          </Text>
                          {track.selectedTrack && (
                            <Text fontSize="sm" color="gray.400">
                              → {track.selectedTrack.name} - {track.selectedTrack.artist}
                            </Text>
                          )}
                        </Box>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditTrack(originalIndex)}
                          borderColor="gray.600"
                          color="gray.300"
                        >
                          再選択
                        </Button>
                      </Flex>
                    </Card.Body>
                  </Card.Root>
                </motion.div>
              );
            })}
          </VStack>
        </MotionBox>
      )}

      {/* スキップした楽曲 */}
      {skippedTracks.length > 0 && (
        <MotionBox
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Heading size="md" mb={3} color="gray.200">
            スキップした楽曲 ({skippedTracks.length})
          </Heading>
          <VStack gap={2} align="stretch">
            {skippedTracks.map((track, index) => {
              const originalIndex = tracks.indexOf(track);
              return (
                <motion.div
                  key={originalIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <Card.Root
                    bg="gray.800"
                    borderWidth="1px"
                    borderColor="gray.700"
                    opacity={0.7}
                  >
                    <Card.Body py={3}>
                      <Flex justify="space-between" align="start" gap={4}>
                        <Box flex="1">
                          <Flex gap={2} mb={2} flexWrap="wrap">
                            <Badge colorScheme="gray" size="sm">
                              {track.animeName}
                            </Badge>
                            <Badge colorScheme="gray" size="sm">
                              {track.song.type}
                            </Badge>
                          </Flex>
                          <Text fontWeight="medium" color="gray.400" fontSize="sm">
                            {track.song.trackName}
                          </Text>
                        </Box>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEditTrack(originalIndex)}
                          borderColor="gray.600"
                          color="gray.400"
                        >
                          再選択
                        </Button>
                      </Flex>
                    </Card.Body>
                  </Card.Root>
                </motion.div>
              );
            })}
          </VStack>
        </MotionBox>
      )}

      {/* アクション */}
      <HStack justify="space-between">
        <Button variant="outline" onClick={onCancel} borderColor="gray.600" color="gray.300">
          キャンセル
        </Button>
        <Button colorScheme="green" onClick={onSave} px={8}>
          保存
        </Button>
      </HStack>
    </VStack>
  );
}
