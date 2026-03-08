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

  const getBackgroundTransform = () => {
    if (currentTab === 'unselected') {
      return {
        range: [-150, 0, 150],
        colors: ['rgb(239 68 68)', 'transparent', 'rgb(78 205 196)'],
      };
    } else if (currentTab === 'watched') {
      return {
        range: [-150, 0],
        colors: ['rgb(255 179 71)', 'transparent'],
      };
    } else {
      return {
        range: [0, 150],
        colors: ['transparent', 'rgb(255 179 71)'],
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
        onSetStatus(anime.id, 'watched');
      } else if (info.offset.x < -threshold) {
        onSetStatus(anime.id, 'unwatched');
      }
    } else if (currentTab === 'watched') {
      if (info.offset.x < -threshold) {
        onSetStatus(anime.id, null);
      }
    } else {
      if (info.offset.x > threshold) {
        onSetStatus(anime.id, null);
      }
    }
  };

  const handleClick = () => {
    if (onClickAnime && Math.abs(dragDistance.current) < 10) {
      onClickAnime(anime);
    }
  };

  const getIndicatorContent = () => {
    if (currentTab === 'unselected') {
      return {
        left: { icon: X, text: '未視聴' },
        right: { icon: Check, text: '視聴済' },
      };
    } else if (currentTab === 'watched') {
      return {
        left: { icon: RotateCcw, text: '戻す' },
        right: null,
      };
    } else {
      return {
        left: null,
        right: { icon: RotateCcw, text: '戻す' },
      };
    }
  };

  const indicatorContent = getIndicatorContent();

  return (
    <MotionBox
      position="relative"
      overflow="hidden"
      borderRadius="14px"
      layout
      initial={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0, marginBottom: 0, transition: { duration: 0.3 } }}
    >
      {/* Background indicators */}
      <MotionBox
        style={{ background }}
        position="absolute"
        inset="0"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={5}
        borderRadius="14px"
      >
        {indicatorContent.left && (
          <Flex gap={1.5} alignItems="center">
            <indicatorContent.left.icon color="white" size={16} />
            <Text color="white" fontWeight="semibold" fontSize="xs">
              {indicatorContent.left.text}
            </Text>
          </Flex>
        )}
        <Box flex="1" />
        {indicatorContent.right && (
          <Flex gap={1.5} alignItems="center">
            <Text color="white" fontWeight="semibold" fontSize="xs">
              {indicatorContent.right.text}
            </Text>
            <indicatorContent.right.icon color="white" size={16} />
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
        bg="#16213e"
        borderRadius="14px"
        border="1px solid rgba(255, 255, 255, 0.06)"
        cursor="grab"
        _active={{ cursor: 'grabbing' }}
        className="swipe-card"
      >
        <Flex py={3} px={4} gap={3} alignItems="center" minH="52px">
          <Box flex="1" minW="0">
            <Text fontWeight="medium" fontSize="sm" wordBreak="break-word" lineHeight="1.4">
              {anime.name}
            </Text>
            <Text fontSize="xs" color="fg.muted" mt={0.5}>
              {anime.songs.length}曲
            </Text>
          </Box>
        </Flex>
      </MotionBox>
    </MotionBox>
  );
}
