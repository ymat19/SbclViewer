'use client';

import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Check, RotateCcw, X } from 'lucide-react';
import { useRef } from 'react';

import type { Anime, ViewTab, AnimeStatus } from '@/types/anime';

interface SwipeableAnimeItemProps {
  anime: Anime;
  currentTab: ViewTab;
  onSetStatus: (id: string, status: AnimeStatus | null) => void;
  onClickAnime?: (anime: Anime) => void;
}

const MotionBox = chakra(motion.div);

export function SwipeableAnimeItem({
  anime,
  currentTab,
  onSetStatus,
  onClickAnime,
}: SwipeableAnimeItemProps) {
  const x = useMotionValue(0);
  const dragDistance = useRef(0);

  // Set background colors based on current tab
  const getBackgroundTransform = () => {
    if (currentTab === 'unselected') {
      // Right swipe: watched (green), Left swipe: unwatched (red)
      return {
        range: [-150, 0, 150],
        colors: ['rgb(239 68 68)', 'transparent', 'rgb(34 197 94)'],
      };
    } else if (currentTab === 'watched') {
      // Left swipe: unselected (gray)
      return {
        range: [-150, 0],
        colors: ['rgb(156 163 175)', 'transparent'],
      };
    } else {
      // unwatched: Right swipe: unselected (gray)
      return {
        range: [0, 150],
        colors: ['transparent', 'rgb(156 163 175)'],
      };
    }
  };

  const bgTransform = getBackgroundTransform();
  const background = useTransform(x, bgTransform.range, bgTransform.colors);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const threshold = 100;
    dragDistance.current = info.offset.x;

    if (currentTab === 'unselected') {
      if (info.offset.x > threshold) {
        // Right swipe -> watched
        onSetStatus(anime.id, 'watched');
      } else if (info.offset.x < -threshold) {
        // Left swipe -> unwatched
        onSetStatus(anime.id, 'unwatched');
      }
    } else if (currentTab === 'watched') {
      if (info.offset.x < -threshold) {
        // Left swipe -> unselected
        onSetStatus(anime.id, null);
      }
    } else {
      // unwatched
      if (info.offset.x > threshold) {
        // Right swipe -> unselected
        onSetStatus(anime.id, null);
      }
    }
  };

  const handleClick = () => {
    // モーダルを開くのはドラッグ（スワイプ）がほぼ発生していないときだけに限定
    if (onClickAnime && Math.abs(dragDistance.current) < 10) {
      onClickAnime(anime);
    }
  };

  // Get indicator content based on current tab
  const getIndicatorContent = () => {
    if (currentTab === 'unselected') {
      return {
        left: { icon: X, text: '未視聴' },
        right: { icon: Check, text: '視聴済み' },
      };
    } else if (currentTab === 'watched') {
      return {
        left: { icon: RotateCcw, text: '未選択' },
        right: null,
      };
    } else {
      return {
        left: null,
        right: { icon: RotateCcw, text: '未選択' },
      };
    }
  };

  const indicatorContent = getIndicatorContent();

  return (
    <MotionBox
      position="relative"
      overflow="hidden"
      layout
      initial={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, transition: { duration: 0.3 } }}
    >
      {/* Background indicators */}
      <MotionBox
        style={{ background }}
        position="absolute"
        inset="0"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={6}
      >
        {indicatorContent.left && (
          <Flex gap={2} alignItems="center">
            <indicatorContent.left.icon color="white" size={20} />
            <Text color="white" fontWeight="semibold" fontSize="sm">
              {indicatorContent.left.text}
            </Text>
          </Flex>
        )}
        {indicatorContent.right && (
          <Flex gap={2} alignItems="center">
            <Text color="white" fontWeight="semibold" fontSize="sm">
              {indicatorContent.right.text}
            </Text>
            <indicatorContent.right.icon color="white" size={20} />
          </Flex>
        )}
      </MotionBox>

      {/* Swipeable content */}
      <MotionBox
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        dragMomentum={false}
        onPointerDown={() => {
          dragDistance.current = 0;
        }}
        onDragEnd={handleDragEnd}
        onTap={handleClick}
        style={{ x }}
        position="relative"
        bg="white"
        _dark={{ bg: 'gray.800' }}
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
      >
        <Flex p={4} gap={3} alignItems="center">
          <Box flex="1" minW="0">
            <Text fontWeight="medium" wordBreak="break-word">
              {anime.name}
            </Text>
            <Text fontSize="sm" color="fg.muted">
              {anime.songs.length} song{anime.songs.length > 1 ? 's' : ''}
            </Text>
          </Box>
        </Flex>
      </MotionBox>
    </MotionBox>
  );
}
