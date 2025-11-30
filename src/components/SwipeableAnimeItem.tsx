'use client';

import { Box, Flex, Text, chakra } from '@chakra-ui/react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';

import type { Anime, ViewTab, AnimeStatus } from '@/types/anime';

interface SwipeableAnimeItemProps {
  anime: Anime;
  currentTab: ViewTab;
  onSetStatus: (id: string, status: AnimeStatus | null) => void;
}

const MotionBox = chakra(motion.div);

export function SwipeableAnimeItem({ anime, currentTab, onSetStatus }: SwipeableAnimeItemProps) {
  const x = useMotionValue(0);

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

  // Get indicator text based on current tab
  const getIndicatorText = () => {
    if (currentTab === 'unselected') {
      return { left: '← 未視聴', right: '視聴済み →' };
    } else if (currentTab === 'watched') {
      return { left: '← 未選択', right: '' };
    } else {
      return { left: '', right: '未選択 →' };
    }
  };

  const indicatorText = getIndicatorText();

  return (
    <Box position="relative" overflow="hidden">
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
        {indicatorText.left && (
          <Text color="white" fontWeight="semibold" fontSize="sm">
            {indicatorText.left}
          </Text>
        )}
        {indicatorText.right && (
          <Text color="white" fontWeight="semibold" fontSize="sm">
            {indicatorText.right}
          </Text>
        )}
      </MotionBox>

      {/* Swipeable content */}
      <MotionBox
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
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
            <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
              {anime.songs.length} song{anime.songs.length > 1 ? 's' : ''}
            </Text>
          </Box>
        </Flex>
      </MotionBox>
    </Box>
  );
}
