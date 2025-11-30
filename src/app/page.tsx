'use client';

import {
  Box,
  Container,
  Heading,
  VStack,
  Text,
  NativeSelectRoot,
  NativeSelectField,
  Card,
  Flex,
  Spinner,
  Badge,
  Tabs,
} from '@chakra-ui/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { SwipeableAnimeItem } from '@/components/SwipeableAnimeItem';
import { useAnimeStatuses } from '@/hooks/useAnimeStatuses';
import type { Anime, Song, ViewTab } from '@/types/anime';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [animeData, setAnimeData] = useState<Anime[]>([]);
  const [quarters, setQuarters] = useState<string[]>([]);
  const [currentTab, setCurrentTab] = useState<ViewTab>('unselected');
  const { statuses: animeStatuses, setStatus: setAnimeStatus } = useAnimeStatuses();
  const [isLoading, setIsLoading] = useState(true);

  // Get selected quarter from URL or use latest
  const selectedQuarter = searchParams.get('quarter') || '';

  // Update URL when quarter changes
  const setSelectedQuarter = (quarter: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('quarter', quarter);
    router.push(`?${params.toString()}`);
  };

  // Load anime data
  useEffect(() => {
    fetch('/data.json')
      .then((res) => res.json())
      .then((data: Anime[]) => {
        setAnimeData(data);

        // Extract unique quarters and sort them
        const uniqueQuarters = Array.from(new Set(data.map((anime) => anime.quarter))).sort();
        setQuarters(uniqueQuarters);

        // Set default to most recent quarter if not in URL
        if (uniqueQuarters.length > 0 && !searchParams.get('quarter')) {
          const params = new URLSearchParams(searchParams.toString());
          params.set('quarter', uniqueQuarters[uniqueQuarters.length - 1] as string);
          router.replace(`?${params.toString()}`);
        }

        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load anime data:', error);
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter anime by selected quarter and exclude anime without songs
  const quarterAnime = animeData.filter(
    (anime) => anime.quarter === selectedQuarter && anime.songs.length > 0,
  );

  // Filter by current tab
  const filteredAnime = quarterAnime.filter((anime) => {
    const status = animeStatuses.get(anime.id);
    if (currentTab === 'unselected') {
      return status === undefined;
    } else if (currentTab === 'watched') {
      return status === 'watched';
    } else {
      return status === 'unwatched';
    }
  });

  // Get watched anime for song list
  const watchedAnime = quarterAnime.filter((anime) => animeStatuses.get(anime.id) === 'watched');

  // Get all songs from watched anime
  const allSongs: Array<Song & { animeName: string }> = watchedAnime.flatMap((anime) =>
    anime.songs.map((song) => ({
      ...song,
      animeName: anime.name,
    })),
  );

  // Count anime in each tab
  const unwatchedCount = quarterAnime.filter(
    (anime) => animeStatuses.get(anime.id) === 'unwatched',
  ).length;
  const unselectedCount = quarterAnime.filter((anime) => !animeStatuses.has(anime.id)).length;
  const watchedCount = quarterAnime.filter(
    (anime) => animeStatuses.get(anime.id) === 'watched',
  ).length;

  if (isLoading) {
    return (
      <Flex minH="100vh" alignItems="center" justifyContent="center">
        <VStack gap={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.600" _dark={{ color: 'gray.400' }}>
            Loading...
          </Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: 'gray.900' }} py={4} px={4}>
      <Container maxW="6xl">
        <VStack gap={6} align="stretch">
          <Heading
            as="h1"
            size={{ base: 'lg', md: '2xl' }}
            textAlign={{ base: 'center', md: 'left' }}
          >
            Anime Song Playlist Creator
          </Heading>

          {/* Quarter Selector */}
          <Box>
            <Text
              fontSize="sm"
              fontWeight="medium"
              mb={2}
              color="gray.700"
              _dark={{ color: 'gray.300' }}
            >
              Select Quarter:
            </Text>
            <NativeSelectRoot maxW={{ base: 'full', md: 'xs' }}>
              <NativeSelectField
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(e.target.value)}
                bg="white"
                _dark={{ bg: 'gray.800' }}
              >
                {quarters.map((quarter) => (
                  <option key={quarter} value={quarter}>
                    {quarter}
                  </option>
                ))}
              </NativeSelectField>
            </NativeSelectRoot>
          </Box>

          {/* Anime List with Tabs */}
          <Box overflow="hidden">
            <Heading as="h2" size={{ base: 'md', md: 'lg' }} mb={4}>
              Anime List
            </Heading>
            <Tabs.Root
              value={currentTab}
              onValueChange={(e) => setCurrentTab(e.value as ViewTab)}
              variant="enclosed"
              fitted={false}
            >
              <Tabs.List mx={-1}>
                <Tabs.Trigger value="unwatched">
                  <Flex gap={2} align="center">
                    <Text whiteSpace="nowrap">未視聴</Text>
                    <Badge colorScheme="red" borderRadius="full">
                      {unwatchedCount}
                    </Badge>
                  </Flex>
                </Tabs.Trigger>
                <Tabs.Trigger value="unselected">
                  <Flex gap={2} align="center">
                    <Text whiteSpace="nowrap">未選択</Text>
                    <Badge colorScheme="gray" borderRadius="full">
                      {unselectedCount}
                    </Badge>
                  </Flex>
                </Tabs.Trigger>
                <Tabs.Trigger value="watched">
                  <Flex gap={2} align="center">
                    <Text whiteSpace="nowrap">視聴済み</Text>
                    <Badge colorScheme="green" borderRadius="full">
                      {watchedCount}
                    </Badge>
                  </Flex>
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value={currentTab} pt={4}>
                <Card.Root maxH="md" overflowY="auto" bg="white" _dark={{ bg: 'gray.800' }}>
                  {filteredAnime.length === 0 ? (
                    <Card.Body>
                      <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                        このクォーターに該当する作品がありません。
                      </Text>
                    </Card.Body>
                  ) : (
                    <VStack gap={0} align="stretch" divideY="1px">
                      {filteredAnime.map((anime) => (
                        <SwipeableAnimeItem
                          key={anime.id}
                          anime={anime}
                          currentTab={currentTab}
                          onSetStatus={setAnimeStatus}
                        />
                      ))}
                    </VStack>
                  )}
                </Card.Root>
              </Tabs.Content>
            </Tabs.Root>
          </Box>

          {/* Songs List */}
          <Box>
            <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={2}>
              <Heading as="h2" size={{ base: 'md', md: 'lg' }}>
                Songs from Watched Anime
              </Heading>
              <Badge
                colorScheme="green"
                fontSize={{ base: 'xs', md: 'sm' }}
                px={3}
                py={1}
                borderRadius="full"
              >
                {allSongs.length} songs
              </Badge>
            </Flex>
            <Card.Root bg="white" _dark={{ bg: 'gray.800' }}>
              {allSongs.length === 0 ? (
                <Card.Body>
                  <Text color="gray.600" _dark={{ color: 'gray.400' }}>
                    Select anime to see their songs. Swipe right to add, swipe left to remove.
                  </Text>
                </Card.Body>
              ) : (
                <VStack gap={0} align="stretch" divideY="1px">
                  {allSongs.map((song, index) => (
                    <Box key={index} p={4}>
                      <Flex mb={1} gap={2} flexWrap="wrap" align="center">
                        <Badge colorScheme="blue" fontSize="xs">
                          {song.animeName}
                        </Badge>
                        <Badge colorScheme="gray" fontSize="xs">
                          {song.type}
                        </Badge>
                      </Flex>
                      <Text fontWeight="medium" mb={1}>
                        {song.trackName}
                      </Text>
                      <VStack
                        align="start"
                        gap={0}
                        fontSize="sm"
                        color="gray.600"
                        _dark={{ color: 'gray.400' }}
                      >
                        {song.artist && <Text>Artist: {song.artist}</Text>}
                        {song.composer && <Text>Composer: {song.composer}</Text>}
                        {song.lyrics && <Text>Lyrics: {song.lyrics}</Text>}
                        {song.arranger && <Text>Arranger: {song.arranger}</Text>}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              )}
            </Card.Root>
          </Box>
        </VStack>
      </Container>
    </Box>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <Flex minH="100vh" alignItems="center" justifyContent="center">
          <VStack gap={4}>
            <Spinner size="xl" color="blue.500" />
            <Text color="gray.600" _dark={{ color: 'gray.400' }}>
              Loading...
            </Text>
          </VStack>
        </Flex>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
