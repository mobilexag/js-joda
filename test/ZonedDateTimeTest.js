/*
 * @copyright (c) 2016, Philipp Thürwächter & Pattrick Hüper
 * @license BSD-3-Clause (see LICENSE in the root directory of this source tree)
 */

import './_init';
import {assertEquals, dataProviderTest} from './testUtils';

import {expect} from 'chai';

import {DateTimeException, IllegalArgumentException} from '../src/errors';

import {DayOfWeek} from '../src/DayOfWeek';
import {LocalDate} from '../src/LocalDate';
import {LocalDateTime} from '../src/LocalDateTime';
import {LocalTime} from '../src/LocalTime';
import {MathUtil} from '../src/MathUtil';
import {Month} from '../src/Month';
import {ZonedDateTime} from '../src/ZonedDateTime';
import {ZoneOffset} from '../src/ZoneOffset';
import {SystemDefaultZoneId} from '../src/zone/SystemDefaultZoneId';

import {ChronoField} from '../src/temporal/ChronoField';
import {ChronoUnit} from '../src/temporal/ChronoUnit';
import {TemporalAdjusters} from '../src/temporal/TemporalAdjusters';
import {TemporalField} from '../src/temporal/TemporalField';
import {TemporalUnit} from '../src/temporal/TemporalUnit';
import {TemporalQueries} from '../src/temporal/TemporalQueries';
import {ValueRange} from '../src/temporal/ValueRange';

import {CurrentStandardZoneAmericaNew_York} from './zone/CurrentStandardZone';
import {CurrentStandardZoneEuropeBerlin} from './zone/CurrentStandardZone';

/**
 * js-joda tests for use cases that are not covered in the treeten bp reference tests
 */
describe('ZonedDateTime', () => {

    const LOCAL_DATE_IN_SUMMER = LocalDateTime.of(2016, 6, 30, 11, 30, 59, 500);
    const LOCAL_DATE_IN_WINTER = LocalDateTime.of(2016, 12, 21, 11, 30, 59, 500);

    const SYSTEM_DEFAULT_ZONE = new SystemDefaultZoneId();
    const FIXED_ZONE_00 = new ZoneOffset.ofHours(0);
    const FIXED_ZONE_01 = new ZoneOffset.ofHours(1);
    const FIXED_ZONE_02 = new ZoneOffset.ofHours(2);
    const FIXED_ZONE_06 = new ZoneOffset.ofHours(6);
    const FIXED_ZONE_M04 = new ZoneOffset.ofHours(-4);
    const FIXED_ZONE_M05 = new ZoneOffset.ofHours(-5);
    const EUROPE_BERLIN = new CurrentStandardZoneEuropeBerlin();
    const AMERICA_NEW_YORCK = new CurrentStandardZoneAmericaNew_York();

    describe('ofLocal', () => {

        it('should point to the same point in the timeline for the given zoneIds', () => {

            const testZones = () => {
                return [
                    SYSTEM_DEFAULT_ZONE,
                    ZoneOffset.UTC,
                    EUROPE_BERLIN,
                    AMERICA_NEW_YORCK
                ];
            };

            dataProviderTest(testZones, (zone) => {
                let zdt = ZonedDateTime.ofLocal(LOCAL_DATE_IN_SUMMER, zone);
                let utcSameInstant = ZonedDateTime.parse('2016-06-30T11:30:59.000000500Z');
                expect(utcSameInstant.isEqual(zdt));
            });

        });

        it('should equal in case of a local date with one valid offset at this zone', () => {

            const testLocalToZoneEquality = () => {
                return [
                    [LOCAL_DATE_IN_SUMMER, FIXED_ZONE_06, '2016-06-30T11:30:59.000000500+06:00'],
                    [LOCAL_DATE_IN_SUMMER, ZoneOffset.UTC, '2016-06-30T11:30:59.000000500Z'],
                    [LOCAL_DATE_IN_SUMMER, EUROPE_BERLIN, '2016-06-30T11:30:59.000000500+02:00[Pseudo/Europe/Berlin]'],
                    [LOCAL_DATE_IN_WINTER, EUROPE_BERLIN, '2016-12-21T11:30:59.000000500+01:00[Pseudo/Europe/Berlin]'],
                    [LOCAL_DATE_IN_SUMMER, AMERICA_NEW_YORCK, '2016-06-30T11:30:59.000000500-04:00[Pseudo/America/New_York]'],
                    [LOCAL_DATE_IN_WINTER, AMERICA_NEW_YORCK, '2016-12-21T11:30:59.000000500-05:00[Pseudo/America/New_York]'],
                ];
            };

            dataProviderTest(testLocalToZoneEquality, (localDateTime, zone, expectedZonedDateAsString) => {
                let zdt = ZonedDateTime.ofLocal(localDateTime, zone);
                expect(zdt.toString()).to.equal(expectedZonedDateAsString);
            });

        });

        it('should add zone offset for a local date with a gap at this zone', () => {

            const testLocalToZoneEquality = () => {
                return [
                    ['2016-03-27T02:00', EUROPE_BERLIN, '2016-03-27T03:00+02:00[Pseudo/Europe/Berlin]'],
                    ['2016-03-27T02:30', EUROPE_BERLIN, '2016-03-27T03:30+02:00[Pseudo/Europe/Berlin]'],
                    ['2016-03-27T03:00', EUROPE_BERLIN, '2016-03-27T03:00+02:00[Pseudo/Europe/Berlin]'],
                    ['2016-03-13T02:00', AMERICA_NEW_YORCK, '2016-03-13T03:00-04:00[Pseudo/America/New_York]'],
                    ['2016-03-13T02:30', AMERICA_NEW_YORCK, '2016-03-13T03:30-04:00[Pseudo/America/New_York]'],
                    ['2016-03-13T03:00', AMERICA_NEW_YORCK, '2016-03-13T03:00-04:00[Pseudo/America/New_York]'],
                ];
            };

            dataProviderTest(testLocalToZoneEquality, (localDateTimeAsString, zone, expectedZonedDateAsString) => {
                let ldt = LocalDateTime.parse(localDateTimeAsString);
                let zdt = ZonedDateTime.ofLocal(ldt, zone);
                expect(zdt.toString()).to.equal(expectedZonedDateAsString);
            });

        });

        it('should return the previous offset for a local date with an overlap at this zone', () => {

            const testLocalToZoneEquality = () => {
                return [
                    ['2016-10-30T02:00', EUROPE_BERLIN, '2016-10-30T02:00+02:00[Pseudo/Europe/Berlin]'],
                    ['2016-10-30T02:30', EUROPE_BERLIN, '2016-10-30T02:30+02:00[Pseudo/Europe/Berlin]'],
                    ['2016-10-30T03:00', EUROPE_BERLIN, '2016-10-30T03:00+01:00[Pseudo/Europe/Berlin]'],
                    ['2016-11-06T01:00', AMERICA_NEW_YORCK, '2016-11-06T01:00-04:00[Pseudo/America/New_York]'],
                    ['2016-11-06T01:30', AMERICA_NEW_YORCK, '2016-11-06T01:30-04:00[Pseudo/America/New_York]'],
                    ['2016-11-06T02:00', AMERICA_NEW_YORCK, '2016-11-06T02:00-05:00[Pseudo/America/New_York]'],
                ];
            };

            dataProviderTest(testLocalToZoneEquality, (localDateTimeAsString, zone, expectedZonedDateAsString) => {
                let ldt = LocalDateTime.parse(localDateTimeAsString);
                let zdt = ZonedDateTime.ofLocal(ldt, zone);
                expect(zdt.toString()).to.equal(expectedZonedDateAsString);
            });

        });

        it('should return the preferred offset if specified in an overlap situation', () => {

            const testLocalToZoneEquality = () => {
                return [
                    ['2016-10-30T02:30', EUROPE_BERLIN, ZoneOffset.ofHours(1)],
                    ['2016-10-30T02:30', EUROPE_BERLIN, ZoneOffset.ofHours(2)],
                    ['2016-11-06T01:30', AMERICA_NEW_YORCK, ZoneOffset.ofHours(-4)],
                    ['2016-11-06T01:30', AMERICA_NEW_YORCK, ZoneOffset.ofHours(-5)],
                ];
            };

            dataProviderTest(testLocalToZoneEquality, (localDateTimeAsString, zone, preferredOffset) => {
                let ldt = LocalDateTime.parse(localDateTimeAsString);
                let zdt = ZonedDateTime.ofLocal(ldt, zone, preferredOffset);
                expect(zdt.offset()).to.equal(preferredOffset);
            });

        });

    });

    describe('until()', () => {

        describe('with units in fixed zone', () => {

            function provider_until() {
                return [
                    ['2012-06-30T01:00', '2012-06-30T00:00', ChronoUnit.DAYS, 0],
                    ['2012-06-30T01:00', '2012-06-30T00:00', ChronoUnit.WEEKS, 0],
                    ['2012-06-30T01:00', '2012-06-30T00:00', ChronoUnit.MONTHS, 0],
                    ['2012-06-30T01:00', '2012-06-30T00:00', ChronoUnit.YEARS, 0],
                    ['2012-06-30T01:00', '2012-06-30T00:00', ChronoUnit.DECADES, 0],
                    ['2012-06-30T01:00', '2012-06-30T00:00', ChronoUnit.CENTURIES, 0],
                    ['2012-06-30T01:00', '2012-06-30T00:00', ChronoUnit.MILLENNIA, 0],

                    ['2012-06-15T01:00', '2013-06-15T00:00', ChronoUnit.DAYS, 364],
                    ['2012-06-15T01:00', '2013-06-15T00:00', ChronoUnit.WEEKS, 52],
                    ['2012-06-15T01:00', '2013-06-15T00:00', ChronoUnit.MONTHS, 11],
                    ['2012-06-15T01:00', '2013-06-15T00:00', ChronoUnit.YEARS, 0, -1],
                    ['2012-06-15T01:00', '2013-06-15T00:00', ChronoUnit.DECADES, 0],
                    ['2012-06-15T01:00', '2013-06-15T00:00', ChronoUnit.CENTURIES, 0],
                    ['2012-06-15T01:00', '2013-06-15T00:00', ChronoUnit.MILLENNIA, 0],

                    ['2012-06-15T00:00', '2012-06-15T00:00', ChronoUnit.NANOS, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00', ChronoUnit.MICROS, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00', ChronoUnit.MILLIS, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00', ChronoUnit.SECONDS, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00', ChronoUnit.MINUTES, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00', ChronoUnit.HOURS, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00', ChronoUnit.HALF_DAYS, 0],

                    ['2012-06-15T00:00', '2012-06-15T00:00:01', ChronoUnit.NANOS, 1000000000],
                    ['2012-06-15T00:00', '2012-06-15T00:00:01', ChronoUnit.MICROS, 1000000],
                    ['2012-06-15T00:00', '2012-06-15T00:00:01', ChronoUnit.MILLIS, 1000],
                    ['2012-06-15T00:00', '2012-06-15T00:00:01', ChronoUnit.SECONDS, 1],
                    ['2012-06-15T00:00', '2012-06-15T00:00:01', ChronoUnit.MINUTES, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00:01', ChronoUnit.HOURS, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:00:01', ChronoUnit.HALF_DAYS, 0],

                    ['2012-06-15T00:00', '2012-06-15T00:01', ChronoUnit.NANOS, 60000000000],
                    ['2012-06-15T00:00', '2012-06-15T00:01', ChronoUnit.MICROS, 60000000],
                    ['2012-06-15T00:00', '2012-06-15T00:01', ChronoUnit.MILLIS, 60000],
                    ['2012-06-15T00:00', '2012-06-15T00:01', ChronoUnit.SECONDS, 60],
                    ['2012-06-15T00:00', '2012-06-15T00:01', ChronoUnit.MINUTES, 1],
                    ['2012-06-15T00:00', '2012-06-15T00:01', ChronoUnit.HOURS, 0],
                    ['2012-06-15T00:00', '2012-06-15T00:01', ChronoUnit.HALF_DAYS, 0],

                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:39.499', ChronoUnit.SECONDS, -1],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:39.500', ChronoUnit.SECONDS, -1],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:39.501', ChronoUnit.SECONDS, 0],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:40.499', ChronoUnit.SECONDS, 0],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:40.500', ChronoUnit.SECONDS, 0],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:40.501', ChronoUnit.SECONDS, 0],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:41.499', ChronoUnit.SECONDS, 0],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:41.500', ChronoUnit.SECONDS, 1],
                    ['2012-06-15T12:30:40.500', '2012-06-15T12:30:41.501', ChronoUnit.SECONDS, 1],

                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:39.499', ChronoUnit.SECONDS, 86400 - 2],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:39.500', ChronoUnit.SECONDS, 86400 - 1],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:39.501', ChronoUnit.SECONDS, 86400 - 1],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:40.499', ChronoUnit.SECONDS, 86400 - 1],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:40.500', ChronoUnit.SECONDS, 86400 + 0],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:40.501', ChronoUnit.SECONDS, 86400 + 0],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:41.499', ChronoUnit.SECONDS, 86400 + 0],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:41.500', ChronoUnit.SECONDS, 86400 + 1],
                    ['2012-06-15T12:30:40.500', '2012-06-16T12:30:41.501', ChronoUnit.SECONDS, 86400 + 1]
                ];
            }

            it('test_until', function () {
                dataProviderTest(provider_until, (startStr, endStr, unit, expected) => {
                    let start = LocalDateTime.parse(startStr).atZone(FIXED_ZONE_01);
                    let end = LocalDateTime.parse(endStr).atZone(FIXED_ZONE_01);
                    assertEquals(start.until(end, unit), expected);
                });
            });

            it('test_until_reveresed', function () {
                dataProviderTest(provider_until, (startStr, endStr, unit, expected) => {
                    var start = LocalDateTime.parse(startStr).atZone(FIXED_ZONE_01);
                    var end = LocalDateTime.parse(endStr).atZone(FIXED_ZONE_01);
                    assertEquals(end.until(start, unit), MathUtil.safeZero(-expected));
                });
            });

        });

        describe('date based distance in same zone', ()=>{

            function data_plusDays(){
                return [
                    // normal
                    [zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01),
                        0, zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01)],
                    [zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01),
                        0, zoneDateTime(2008, 7, 1, 23, 30, 58, 0, FIXED_ZONE_01, FIXED_ZONE_01)],
                    [zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01),
                        1, zoneDateTime(2008, 7, 1, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01)],
                    [zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01),
                        -1, zoneDateTime(2008, 6, 29, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01)],
                    // skip over gap
                    [zoneDateTime(2008, 3, 30, 1, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN),
                        1, zoneDateTime(2008, 3, 31, 1, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 3, 30, 3, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        -1, zoneDateTime(2008, 3, 29, 3, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)],
                    // land in gap
                    [zoneDateTime(2008, 3, 29, 2, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN),
                        1, zoneDateTime(2008, 3, 30, 3, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 3, 31, 2, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        0, zoneDateTime(2008, 3, 30, 3, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN)],
                    // skip over overlap
                    [zoneDateTime(2008, 10, 26, 1, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        1, zoneDateTime(2008, 10, 27, 1, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 10, 25, 3, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        1, zoneDateTime(2008, 10, 26, 3, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)],
                    // land in overlap
                    [zoneDateTime(2008, 10, 25, 2, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        1, zoneDateTime(2008, 10, 26, 2, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 10, 27, 2, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN),
                        -1, zoneDateTime(2008, 10, 26, 2, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)]
                ];
            }

            it('should calculate the distance in days unit', () => {
                dataProviderTest(data_plusDays, (start, expectedDays, end) => {
                    expect(start.until(end, ChronoUnit.DAYS)).to.equal(expectedDays);
                    expect(end.until(start, ChronoUnit.DAYS)).to.equal(-1 * expectedDays);
                });
            });

        });

        describe('time based distance in same zone', () => {

            function data_plusTime(){
                return [
                    // normal
                    [zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01),
                        0,  zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01)],
                    [zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01),
                        1,  zoneDateTime(2008, 7, 1, 0, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01)],
                    [zoneDateTime(2008, 6, 30, 23, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01),
                        -1, zoneDateTime(2008, 6, 30, 22, 30, 59, 0, FIXED_ZONE_01, FIXED_ZONE_01)],
                    // gap
                    [zoneDateTime(2008, 3, 30, 1, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN),
                        1,  zoneDateTime(2008, 3, 30, 3, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 3, 30, 3, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        -1, zoneDateTime(2008, 3, 30, 1, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)],
                    // overlap
                    [zoneDateTime(2008, 10, 26, 1, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        1, zoneDateTime(2008, 10, 26, 2, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 10, 26, 1, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        2, zoneDateTime(2008, 10, 26, 2, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 10, 26, 1, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        3, zoneDateTime(2008, 10, 26, 3, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 10, 26, 2, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        1, zoneDateTime(2008, 10, 26, 2, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)],
                    [zoneDateTime(2008, 10, 26, 2, 30, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN),
                        2, zoneDateTime(2008, 10, 26, 3, 30, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN)]
                ];
            }

            it('should calculate distance in hours unit', () => {
                dataProviderTest(data_plusTime, (start, expectedHours, end) => {
                    expect(start.until(end, ChronoUnit.HOURS)).to.equal(expectedHours);
                    expect(end.until(start, ChronoUnit.HOURS)).to.equal(-1 * expectedHours);
                });
            });
        });

        describe('distance in different zones', () => {

            function data_until_Zone1_Zone2(){
                return [
                    // normal winter
                    [zoneDateTimeAtStartOfDay(2016, 1, 1, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTimeAtStartOfDay(2016, 1, 2, FIXED_ZONE_01, EUROPE_BERLIN), 23],
                    [zoneDateTimeAtStartOfDay(2016, 1, 1, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTime(2016, 1, 2, 1, 0, 0, 0, FIXED_ZONE_01, EUROPE_BERLIN), 24],

                    // normal summer
                    [zoneDateTimeAtStartOfDay(2016, 7, 1, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTimeAtStartOfDay(2016, 7, 2, FIXED_ZONE_02, EUROPE_BERLIN), 22],
                    [zoneDateTimeAtStartOfDay(2016, 7, 1, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTime(2016, 7, 2, 1, 0, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN), 23],
                    [zoneDateTimeAtStartOfDay(2016, 7, 1, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTime(2016, 7, 2, 2, 0, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN), 24],
                    [zoneDateTimeAtStartOfDay(2016, 7, 1, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTime(2016, 7, 2, 3, 0, 0, 0, FIXED_ZONE_02, EUROPE_BERLIN), 25],

                    // gap
                    [zoneDateTimeAtStartOfDay(2016, 3, 27, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTimeAtStartOfDay(2016, 3, 28, FIXED_ZONE_02, EUROPE_BERLIN), 22],
                    [zoneDateTimeAtStartOfDay(2016, 3, 27, FIXED_ZONE_M04, AMERICA_NEW_YORCK),
                        zoneDateTimeAtStartOfDay(2016, 3, 28, FIXED_ZONE_02, EUROPE_BERLIN), 18],
                    [zoneDateTimeAtStartOfDay(2016, 3, 1, FIXED_ZONE_M05, AMERICA_NEW_YORCK),
                        zoneDateTimeAtStartOfDay(2016, 3, 28, FIXED_ZONE_02, EUROPE_BERLIN), 26*24 + 17],

                    // overlap
                    [zoneDateTimeAtStartOfDay(2016, 10, 30, FIXED_ZONE_00, ZoneOffset.UTC),
                        zoneDateTimeAtStartOfDay(2016, 10, 31, FIXED_ZONE_01, EUROPE_BERLIN), 23],
                    [zoneDateTimeAtStartOfDay(2016, 10, 30, FIXED_ZONE_M04, AMERICA_NEW_YORCK),
                        zoneDateTimeAtStartOfDay(2016, 10, 31, FIXED_ZONE_01, EUROPE_BERLIN), 19],

                    [zoneDateTimeAtStartOfDay(2016, 10, 30, FIXED_ZONE_02, EUROPE_BERLIN),
                        zoneDateTimeAtStartOfDay(2016, 11, 30, FIXED_ZONE_M05, AMERICA_NEW_YORCK), 31*24 + 7],

                ];
            }

            it('should caclulate distance in hours', ()=> {
                dataProviderTest(data_until_Zone1_Zone2, (zone1, zone2, expectedHours) => {
                    assertEquals(zone1.until(zone2, ChronoUnit.HOURS),  expectedHours);
                    assertEquals(zone2.until(zone1, ChronoUnit.HOURS), -expectedHours);
                });
            });

            it('should caclulate distance in days', ()=> {
                dataProviderTest(data_until_Zone1_Zone2, (zone1, zone2, expectedHours) => {
                    var expectedDays = Math.floor(expectedHours / 24);
                    assertEquals(zone1.until(zone2, ChronoUnit.DAYS), expectedDays);
                    assertEquals(zone2.until(zone1, ChronoUnit.DAYS), MathUtil.safeZero(-expectedDays));
                });
            });

        });
    });

    describe('of() factories', function () {

        it('of(date, time, zone)', function () {
            let zdt = ZonedDateTime.of(LocalDate.of(2016, 9, 27), LocalTime.of(10, 0), FIXED_ZONE_00);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 9, 27, 10, 0), FIXED_ZONE_00, FIXED_ZONE_00);
            assertEquals(expectedZdt, zdt);
        });

        it('of(year, month, dayOfMonth,hour, minute, second, nanoOfSecond, zone)', function () {
            let zdt = ZonedDateTime.of(2016, 9, 27, 10, 0, 0, 0, FIXED_ZONE_00);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 9, 27, 10, 0), FIXED_ZONE_00, FIXED_ZONE_00);
            assertEquals(expectedZdt, zdt);
        });

        it('ofInstant(dateTime, offset, zone)', function () {
            let zdt = ZonedDateTime.ofInstant(LocalDateTime.of(2016, 9, 27, 10, 0), FIXED_ZONE_00, FIXED_ZONE_00);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 9, 27, 10, 0), FIXED_ZONE_00, FIXED_ZONE_00);
            assertEquals(expectedZdt, zdt);
        });

        describe('ofLenient(localDateTime, offset, zone)', function () {

            it('should construct an invalid zoned data time instance', function () {
                let zdt = ZonedDateTime.ofLenient(LocalDateTime.of(2016, 9, 27, 10, 0), FIXED_ZONE_00, EUROPE_BERLIN);
                assertEquals(LocalDateTime.of(2016, 9, 27, 10, 0), zdt.toLocalDateTime());
                assertEquals(FIXED_ZONE_00, zdt.offset());
                assertEquals(EUROPE_BERLIN, zdt.zone());
            });

            it('should fail for not equal zone offsets', function () {
                expect(()=>{
                    ZonedDateTime.ofLenient(LocalDateTime.of(2016, 9, 27, 10, 0), FIXED_ZONE_00, FIXED_ZONE_02);
                }).to.throw(IllegalArgumentException);                
            });

        });

        describe('from(temporal not supporting INSTANT_SECONDS)', function () {

            class ZDTTemporal {
                constructor(ErrorClass){
                    this.ErrorClass = ErrorClass;
                }
                query(query) {
                    if (query === TemporalQueries.zone()) {
                        return FIXED_ZONE_00;
                    } else if(query === TemporalQueries.localDate()){
                        return LocalDate.of(2016, 9, 27);
                    } else if(query === TemporalQueries.localTime()){
                        return LocalTime.of(10, 0);
                    }
                    return null;
                }
                isSupported(){
                    return true;
                }
                getLong(field){
                    throw new this.ErrorClass(field.toString() + ' not supported');
                }
            }

            it('should ignore DateTimeException', function () {
                let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 9, 27, 10, 0), FIXED_ZONE_00, FIXED_ZONE_00);
                let temporal = new ZDTTemporal(DateTimeException);
                let zdt = ZonedDateTime.from(temporal);
                assertEquals(expectedZdt, zdt);
            });

            it('should re-throw a not DateTimeException', function () {
                let temporal = new ZDTTemporal(Error);
                expect(() => {
                    ZonedDateTime.from(temporal);
                }).to.throw(Error);
            });

        });

    });

    describe('getters', function () {
        const zdt = new ZonedDateTime.ofStrict(LocalDate.of(2016, 9, 28).atStartOfDay(), FIXED_ZONE_02, EUROPE_BERLIN);

        describe('isSupported()', function () {

            it('should support a ChronoField', function () {
                expect(zdt.isSupported(ChronoField.DAY_OF_MONTH)).to.be.true;
            });

            it('should support date/ time based ChronoUnits', function () {
                expect(zdt.isSupported(ChronoUnit.SECONDS)).to.be.true;
                expect(zdt.isSupported(ChronoUnit.DAYS)).to.be.true;
                expect(zdt.isSupported(ChronoUnit.FOREVER)).to.be.false;
            });

            it('should except custom units', function () {
                class CustomUnit extends TemporalUnit{
                    isSupportedBy(){
                        return true;
                    }
                }
                expect(zdt.isSupported(new CustomUnit())).to.be.true;
            });
        });

        describe('range()', function () {

            it('should return the value range of ChronoFields', function () {
                assertEquals(zdt.range(ChronoField.INSTANT_SECONDS), ChronoField.INSTANT_SECONDS.range());
                assertEquals(zdt.range(ChronoField.OFFSET_SECONDS), ChronoField.OFFSET_SECONDS.range());
                assertEquals(zdt.range(ChronoField.SECOND_OF_DAY), ChronoField.SECOND_OF_DAY.range());
                assertEquals(zdt.range(ChronoField.DAY_OF_MONTH), ValueRange.of(1, 30));
            });

            it('should return value range of custom fields', function () {
                class CustomField extends TemporalField{
                    rangeRefinedBy(){
                        return ValueRange.of(1, 12);
                    }
                }
                assertEquals(zdt.range(new CustomField()), ValueRange.of(1, 12));
            });

        });

        it('should return year, month, monthValue, etc values', function () {
            expect(zdt.year()).to.equal(2016);
            expect(zdt.month()).to.equal(Month.SEPTEMBER);
            expect(zdt.monthValue()).to.equal(9);
            expect(zdt.dayOfMonth()).to.equal(28);
            expect(zdt.dayOfWeek()).to.equal(DayOfWeek.WEDNESDAY);
            expect(zdt.dayOfYear()).to.equal(272);
            expect(zdt.hour()).to.equal(0);
            expect(zdt.minute()).to.equal(0);
            expect(zdt.second()).to.equal(0);
            expect(zdt.nano()).to.equal(0);
        });

    });

    describe('with()', function () {

        const zdt = ZonedDateTime.ofStrict(LocalDate.of(2016, 9, 28).atStartOfDay(), FIXED_ZONE_02, EUROPE_BERLIN);
        const instant = LocalDate.of(2016, 9, 28).atTime(12,0,0,500).toInstant(FIXED_ZONE_02);

        it('should adjust to instant', function () {
            let adjustedZdt = zdt.with(instant);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 9, 28, 12,0,0,500), FIXED_ZONE_02, EUROPE_BERLIN);
            assertEquals(expectedZdt, adjustedZdt);
        });

        it('should adjust to instant seconds', function () {
            let adjustedZdt = zdt.with(ChronoField.INSTANT_SECONDS, instant.epochSecond());
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 9, 28, 12,0,0,0), FIXED_ZONE_02, EUROPE_BERLIN);
            assertEquals(expectedZdt, adjustedZdt);
        });

        it('should adjust to instant seconds', function () {
            // overlap
            let zdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 30), FIXED_ZONE_02, EUROPE_BERLIN);
            let adjustedZdt = zdt.with(ChronoField.OFFSET_SECONDS, FIXED_ZONE_01.totalSeconds());
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 30), FIXED_ZONE_01, EUROPE_BERLIN);
            assertEquals(expectedZdt, adjustedZdt);
        });

        it('should adjust into next week day', () => {
            let zdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 30), FIXED_ZONE_02, EUROPE_BERLIN);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 11, 6, 2, 30), FIXED_ZONE_01, EUROPE_BERLIN);
            let adjustedZdt = zdt.with(TemporalAdjusters.next(DayOfWeek.SUNDAY));
            assertEquals(expectedZdt, adjustedZdt);
        });

        it('should adjust into a custom field adjuster', () => {
            let zdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 30), FIXED_ZONE_02, EUROPE_BERLIN);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 6, 2, 30), FIXED_ZONE_02, EUROPE_BERLIN);
            let customField = {
                adjustInto: (thisZdt, newValue) => {
                    return thisZdt.with(ChronoField.DAY_OF_MONTH, newValue);
                }
            };
            let adjustedZdt = zdt.with(customField, 6);
            assertEquals(expectedZdt, adjustedZdt);
        });
    });

    describe('truncatedTo', function () {

        it('should truncate to time based value', function () {
            let zdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 30), FIXED_ZONE_02, EUROPE_BERLIN);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 0), FIXED_ZONE_02, EUROPE_BERLIN);
            let truncatedZdt = zdt.truncatedTo(ChronoUnit.HOURS);
            assertEquals(expectedZdt, truncatedZdt);
        });

    });

    describe('plus custom unit', function () {

        it('should add a custom value', function () {
            let zdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 30), FIXED_ZONE_02, EUROPE_BERLIN);
            let expectedZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 7, 30), FIXED_ZONE_01, EUROPE_BERLIN);
            let quarterDayUnit = {
                addTo: (thisZdt, amountToAdd) => {
                    return thisZdt.plusHours(6 * amountToAdd);
                }
            };
            let truncatedZdt = zdt.plus(1, quarterDayUnit);
            assertEquals(expectedZdt, truncatedZdt);
        });

    });

    describe('until with a custom unit', function () {

        it('should calculate the difference in a custom unit', function () {
            let startZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 2, 30), FIXED_ZONE_02, EUROPE_BERLIN);
            let endZdt = ZonedDateTime.ofStrict(LocalDateTime.of(2016, 10, 30, 14, 30), FIXED_ZONE_01, EUROPE_BERLIN);
            let quarterDayUnit = {
                between: (start, end) => {
                    return MathUtil.intDiv(start.until(end, ChronoUnit.HOURS), 6);
                }
            };
            expect(startZdt.until(endZdt, quarterDayUnit)).to.equal(2);
            expect(endZdt.until(startZdt, quarterDayUnit)).to.equal(-2);
        });

    });

});

function zoneDateTimeAtStartOfDay(year, month, dayOfMonth, offset, zoneId) {
    return ZonedDateTime.ofStrict(LocalDate.of(year, month, dayOfMonth).atStartOfDay(), offset, zoneId);
}

function zoneDateTime(year, month, dayOfMonth, hour, minute, second, nanoOfSecond, offset, zoneId) {
    return ZonedDateTime.ofStrict(LocalDateTime.of(year, month, dayOfMonth, hour, minute, second, nanoOfSecond), offset, zoneId);
}

